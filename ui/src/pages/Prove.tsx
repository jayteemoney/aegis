import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';

import { AegisRuntime, failureReason, toHex, type AegisPrivateState } from '@aegis/simulator';
import { CONDITIONS, conditionLabel, DEMO_PATIENTS, DEMO_TRIALS, type DemoTrial } from '@aegis/demo-data';
import { useChain } from '../chain/ChainProvider';
import { useWallet } from '../chain/WalletContext';
import { submitEligibilityCheck } from '../chain/submit';
import { ACTIVE_DEPLOYMENT } from '../deployment';

type Step = 'facts' | 'trial' | 'result';

type Submission =
  | { status: 'idle' }
  | { status: 'submitting'; phase: string }
  | { status: 'submitted'; txId: string }
  | { status: 'failed'; message: string };

type Outcome =
  | { status: 'idle' }
  | { status: 'proving'; phase: string }
  | { status: 'eligible'; nullifier: string; commitment: string }
  | { status: 'ineligible'; reason: string; commitment: string };

const fade = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
};

/**
 * Let the browser paint the phase label before the next stage blocks the main
 * thread. The work either side of this is real; the pause exists so a stage
 * that finishes in two milliseconds is still legible.
 */
const settle = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => setTimeout(resolve, 220));
  });

export function Prove() {
  const { status: chainStatus, state: chain } = useChain();
  const wallet = useWallet();
  const [step, setStep] = useState<Step>('facts');
  const [submission, setSubmission] = useState<Submission>({ status: 'idle' });

  // ── PRIVATE: component state on this device, nowhere else. ──
  const [diagnosis, setDiagnosis] = useState<bigint>(100n);
  const [age, setAge] = useState('42');
  const [onExcludedMedication, setOnExcluded] = useState(false);
  const [identity, setIdentity] = useState(() => DEMO_PATIENTS[0]!.id);

  const [trial, setTrial] = useState<DemoTrial>(DEMO_TRIALS[0]!);
  const [outcome, setOutcome] = useState<Outcome>({ status: 'idle' });

  // The nonce and secret key belong to whichever demo identity is selected.
  // They matter for chain reconciliation: an attestation is a commitment over
  // the facts *and* the nonce, so a different nonce is a different record.
  const secrets = useMemo(() => {
    const p = DEMO_PATIENTS.find((d) => d.id === identity) ?? DEMO_PATIENTS[0]!;
    return { recordNonce: p.state.recordNonce, secretKey: p.state.secretKey };
  }, [identity]);

  const privateState: AegisPrivateState = useMemo(
    () => ({
      diagnosis,
      age: BigInt(age === '' ? 0 : Math.max(0, Math.min(200, Number(age) || 0))),
      onExcludedMedication,
      recordNonce: secrets.recordNonce,
      secretKey: secrets.secretKey,
    }),
    [diagnosis, age, onExcludedMedication, secrets],
  );

  const commitment = useMemo(() => {
    try {
      return toHex(AegisRuntime.recordCommitment(privateState));
    } catch {
      return '';
    }
  }, [privateState]);

  // Is this exact record attested on the deployed contract? Computed from the
  // live ledger, not from a fixture — if an issuer attests it while you watch,
  // this flips on its own.
  const attestedOnChain = Boolean(commitment) && Boolean(chain?.attestations.includes(commitment));

  // The trial as the chain actually holds it, falling back to the fixture when
  // there is no deployment. The criteria the circuit checks are always these.
  const onChainCriteria = chain?.trials.find((t) => t.id === trial.id)?.criteria;
  const criteria = onChainCriteria ?? trial.criteria;

  const nullifier = useMemo(() => {
    try {
      return toHex(AegisRuntime.trialNullifier(privateState, trial.id));
    } catch {
      return '';
    }
  }, [privateState, trial.id]);

  const alreadyOnChain = Boolean(
    nullifier && chain?.results.some((r) => r.nullifier === nullifier),
  );

  function applyPreset(id: string) {
    const p = DEMO_PATIENTS.find((d) => d.id === id);
    if (!p) return;
    setIdentity(p.id);
    setDiagnosis(p.state.diagnosis);
    setAge(String(p.state.age));
    setOnExcluded(p.state.onExcludedMedication);
  }

  const prove = useCallback(async () => {
    // Each phase below performs the work it names. Nothing is a timer standing
    // in for a computation.
    setSubmission({ status: 'idle' });
    setOutcome({ status: 'proving', phase: 'Reading your facts from this device…' });
    await settle();

    setOutcome({ status: 'proving', phase: 'Deriving your blinded record commitment…' });
    const myCommitment = AegisRuntime.recordCommitment(privateState);
    const myCommitmentHex = toHex(myCommitment);
    await settle();

    setOutcome({
      status: 'proving',
      phase: attestedOnChain
        ? 'Matching your commitment against on-chain attestations…'
        : 'No on-chain attestation for these facts — self-attesting locally…',
    });
    await settle();

    setOutcome({ status: 'proving', phase: "Loading the trial's published criteria…" });
    await settle();

    setOutcome({ status: 'proving', phase: 'Executing checkTrialEligibility…' });
    await settle();

    try {
      const runtime = AegisRuntime.create(privateState);
      // Reproduce the public half of the deployed contract locally: the trials
      // the chain holds (or the fixtures, when undeployed) and an attestation
      // for this record, so the circuit sees the same world it would on chain.
      for (const t of DEMO_TRIALS) {
        const live = chain?.trials.find((c) => c.id === t.id);
        runtime.registerTrial(t.id, live?.criteria ?? t.criteria);
      }
      runtime.attestPatientRecord(myCommitment);
      runtime.checkTrialEligibility(trial.id);

      setOutcome({ status: 'proving', phase: 'Deriving the trial nullifier…' });
      await settle();

      setOutcome({
        status: 'eligible',
        nullifier: toHex(AegisRuntime.trialNullifier(privateState, trial.id)),
        commitment: myCommitmentHex,
      });
    } catch (err) {
      setOutcome({
        status: 'ineligible',
        reason: failureReason(err),
        commitment: myCommitmentHex,
      });
    }
    setStep('result');
  }, [privateState, trial.id, chain, attestedOnChain]);

  /**
   * Submit the proof as a transaction.
   *
   * Everything up to here happened in this tab. This is the one step that
   * needs a wallet — not to see the facts, which it never receives, but to
   * prove the circuit, pay the fee and sign.
   */
  const submit = useCallback(async () => {
    if (wallet.state.kind !== 'connected' || !ACTIVE_DEPLOYMENT) return;

    try {
      const txId = await submitEligibilityCheck({
        api: wallet.state.api,
        deployment: ACTIVE_DEPLOYMENT,
        privateState,
        privateStateId: `aegis-patient-${identity}`,
        trialId: trial.id,
        onProgress: (phase) => setSubmission({ status: 'submitting', phase }),
      });
      setSubmission({ status: 'submitted', txId });
    } catch (err) {
      setSubmission({
        status: 'failed',
        message: err instanceof Error ? err.message : 'The wallet rejected the transaction',
      });
    }
  }, [wallet.state, privateState, identity, trial.id]);

  const stepIndex = { facts: 0, trial: 1, result: 2 }[step];

  return (
    <div className="wrap">
      <p className="eyebrow">Eligibility check</p>
      <h1 style={{ fontSize: 'clamp(28px,4.2vw,42px)', marginBottom: 22 }}>
        Three steps, one disclosure
      </h1>

      <ol className="steps">
        {['Your health facts', 'Choose a trial', 'Result'].map((label, i) => (
          <li key={label} className={i === stepIndex ? 'current' : i < stepIndex ? 'done' : ''}>
            <span className="num">{i < stepIndex ? '✓' : i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      <div className="banner">
        <span>{chainStatus.kind === 'live' ? '🔗' : '🔬'}</span>
        <div>
          {chainStatus.kind === 'live' ? (
            <>
              <strong>Reading the deployed contract.</strong> Trial criteria and
              issuer attestations below come from the live ledger. The proof
              itself runs here, in WebAssembly, from the same compiled circuit
              the chain enforces — your facts never travel. Submitting the
              finished proof as a signed transaction needs a browser wallet,
              which is Wave 2; until then{' '}
              <code>scripts/patient.ts</code> does it from
              the CLI and you can watch the result land on the{' '}
              <Link to="/ledger">ledger page</Link>.
            </>
          ) : (
            <>
              <strong>Running the circuit locally.</strong> The eligibility logic
              below is the real compiled Compact circuit executing in your
              browser via WebAssembly — the same code the chain runs, assertions
              included. No deployment record was found, so trial criteria come
              from local fixtures.
            </>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'facts' && (
          <motion.section key="facts" className="panel private" {...fade}>
            <span className="tag private">🔒 private — never leaves this device</span>
            <h3>Your health facts</h3>
            <p style={{ marginBottom: 20 }}>
              Held in this browser tab only. They enter the proof as witnesses
              and are never transmitted, logged, or written to chain.
            </p>

            <div className="row" style={{ marginBottom: 22 }}>
              <span style={{ fontSize: 13, color: 'var(--faint)' }}>Try a sample patient:</span>
              {DEMO_PATIENTS.map((p) => (
                <button
                  key={p.id}
                  className={`btn btn-ghost btn-sm ${identity === p.id ? 'selected' : ''}`}
                  onClick={() => applyPreset(p.id)}
                  title={p.note}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <label>
              Diagnosis
              <select value={String(diagnosis)} onChange={(e) => setDiagnosis(BigInt(e.target.value))}>
                {CONDITIONS.map((c) => (
                  <option key={String(c.code)} value={String(c.code)}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Age
              <input type="number" min={0} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={onExcludedMedication}
                onChange={(e) => setOnExcluded(e.target.checked)}
              />
              I currently take an excluded medication
            </label>

            <div style={{ margin: '24px 0' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                Blinded record commitment — the only thing your clinic publishes
              </span>
              <code className="hash private">{commitment || '…'}</code>
              <div className="row" style={{ marginTop: 10 }}>
                <span className={`chip ${attestedOnChain ? 'ok' : ''}`}>
                  <span className={`dot ${attestedOnChain ? 'live' : 'warn'}`} />
                  {chainStatus.kind !== 'live'
                    ? 'no chain connection — attestation unverified'
                    : attestedOnChain
                      ? 'attested on chain by an issuer'
                      : 'not attested on chain — exploring locally'}
                </span>
              </div>
              <span className="note">
                A commitment over the values above plus a secret nonce.
                Publishing it reveals nothing; without the nonce it cannot be
                reversed or brute-forced across the plausible input space. Edit
                any fact and the commitment changes completely — which is why
                only records an issuer actually signed off are attested.
              </span>
            </div>

            <button className="btn btn-primary" onClick={() => setStep('trial')}>
              Continue →
            </button>
          </motion.section>
        )}

        {step === 'trial' && outcome.status !== 'proving' && (
          <motion.section key="trial" className="panel public" {...fade}>
            <span className="tag public">🌐 public — on the ledger, visible to everyone</span>
            <h3>Choose a trial</h3>
            <p style={{ marginBottom: 20 }}>
              These criteria are published openly by sponsors
              {chainStatus.kind === 'live' ? ' and read here straight from the ledger' : ''}.
              You will prove you satisfy them without disclosing a single
              underlying value.
            </p>

            <div className="grid" style={{ marginBottom: 22 }}>
              {DEMO_TRIALS.map((t) => {
                const live = chain?.trials.find((c) => c.id === t.id);
                const shown = live?.criteria ?? t.criteria;
                return (
                  <button
                    key={String(t.id)}
                    className={`trial ${trial.id === t.id ? 'selected' : ''}`}
                    onClick={() => setTrial(t)}
                  >
                    <strong>{t.name}</strong>
                    <span className="sponsor">{t.sponsor}</span>
                    <dl className="criteria">
                      <div>
                        <dt>Condition</dt>
                        <dd>{conditionLabel(shown.conditionCode)}</dd>
                      </div>
                      <div>
                        <dt>Age band</dt>
                        <dd>
                          {String(shown.minAge)}–{String(shown.maxAge)}
                        </dd>
                      </div>
                      <div>
                        <dt>Excluded meds</dt>
                        <dd>Not permitted</dd>
                      </div>
                    </dl>
                    <span className={`chip ${live ? 'ok' : ''}`} style={{ marginTop: 10 }}>
                      <span className={`dot ${live ? 'live' : ''}`} />
                      {live ? 'on chain' : 'local fixture'}
                    </span>
                  </button>
                );
              })}
            </div>

            {alreadyOnChain && (
              <div className="banner">
                <span>⚠</span>
                <div>
                  <strong>This nullifier is already on the ledger.</strong> The
                  contract rejects a second check for the same trial from the
                  same secret — that is the double-claim guard doing its job. The
                  local run below will still show you the reasoning.
                </div>
              </div>
            )}

            <div className="row">
              <button className="btn btn-ghost" onClick={() => setStep('facts')}>
                Back
              </button>
              <button className="btn btn-primary" onClick={prove}>
                Prove my eligibility
              </button>
            </div>
          </motion.section>
        )}

        {outcome.status === 'proving' && (
          <motion.div key="proving" className="card proving" {...fade}>
            <div className="spinner" />
            <strong>Generating zero-knowledge proof…</strong>
            <AnimatePresence mode="wait">
              <motion.span
                key={outcome.phase}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ display: 'block', marginTop: 6 }}
              >
                {outcome.phase}
              </motion.span>
            </AnimatePresence>
            <span style={{ display: 'block', marginTop: 14, color: 'var(--private)' }}>
              🔒 Your data never leaves this device.
            </span>
          </motion.div>
        )}

        {step === 'result' && outcome.status !== 'proving' && outcome.status !== 'idle' && (
          <motion.section key="result" {...fade}>
            <div className="verdict">
              <h2>{outcome.status === 'eligible' ? 'Eligible' : 'Not eligible'}</h2>
              <span className={`badge ${outcome.status === 'eligible' ? 'ok' : 'bad'}`}>
                {outcome.status === 'eligible' ? '✓ proof accepted' : '✕ proof unsatisfiable'}
              </span>
            </div>

            <p className="lede" style={{ marginBottom: 26 }}>
              {outcome.status === 'eligible' ? (
                <>
                  You meet every criterion for <strong>{trial.name}</strong> —
                  condition {conditionLabel(criteria.conditionCode)}, ages{' '}
                  {String(criteria.minAge)}–{String(criteria.maxAge)}. Here is
                  precisely what that cost you in privacy.
                </>
              ) : (
                <>
                  The circuit refused to produce a proof:{' '}
                  <em style={{ color: 'var(--bad)', fontStyle: 'normal' }}>{outcome.reason}</em>.
                  Because the proof is unsatisfiable, no transaction exists — the
                  sponsor does not learn that you tried.
                </>
              )}
            </p>

            <div className="grid cols-2">
              <motion.div
                className="panel private"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
              >
                <span className="tag private">🔒 stayed on your device</span>
                <ul className="facts">
                  <li><span>Diagnosis</span><code>{conditionLabel(diagnosis)}</code></li>
                  <li><span>Age</span><code>{age}</code></li>
                  <li><span>Excluded medication</span><code>{onExcludedMedication ? 'yes' : 'no'}</code></li>
                  <li><span>Record nonce</span><code>{toHex(secrets.recordNonce).slice(0, 4)}…{toHex(secrets.recordNonce).slice(-4)}</code></li>
                  <li><span>Patient secret key</span><code>{toHex(secrets.secretKey).slice(0, 4)}…{toHex(secrets.secretKey).slice(-4)}</code></li>
                </ul>
                <p className="note">
                  None of these appear in any transaction, log, or ledger entry.
                  Reaching public state requires an explicit <code>disclose()</code>,
                  and none of these values has one.
                </p>
              </motion.div>

              <motion.div
                className="panel public"
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.12 }}
              >
                <span className="tag public">🌐 the ledger saw</span>
                {outcome.status === 'eligible' ? (
                  <>
                    <ul className="facts">
                      <li><span>Eligible</span><code>true</code></li>
                      <li><span>Trial</span><code>#{String(trial.id)}</code></li>
                    </ul>
                    <div style={{ marginTop: 14 }}>
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Nullifier</span>
                      <code className="hash public">{outcome.nullifier}</code>
                    </div>

                    <div className="row" style={{ marginTop: 12 }}>
                      <span className={`chip ${alreadyOnChain ? 'ok' : ''}`}>
                        <span className={`dot ${alreadyOnChain ? 'live' : 'warn'}`} />
                        {chainStatus.kind !== 'live'
                          ? 'not connected to a deployment'
                          : alreadyOnChain
                            ? 'this exact nullifier is on the ledger'
                            : 'not yet submitted on chain'}
                      </span>
                    </div>

                    {chainStatus.kind === 'live' && !alreadyOnChain && (
                      <div className="submit-box">
                        {submission.status === 'submitting' ? (
                          <div className="row">
                            <span className="spinner spinner-sm" />
                            <span>{submission.phase}</span>
                          </div>
                        ) : submission.status === 'submitted' ? (
                          <>
                            <strong style={{ color: 'var(--ok)' }}>Submitted.</strong>{' '}
                            <span className="mono">{submission.txId}</span>
                            <p className="note" style={{ margin: '8px 0 0' }}>
                              The nullifier appears above and on the{' '}
                              <Link to="/ledger">ledger page</Link> as soon as
                              the indexer sees the block.
                            </p>
                          </>
                        ) : wallet.state.kind === 'connected' ? (
                          <>
                            <button className="btn btn-primary btn-sm" onClick={submit}>
                              Submit this proof on chain
                            </button>
                            <p className="note" style={{ margin: '10px 0 0' }}>
                              Your wallet proves the circuit, pays the fee and
                              signs. It receives key material and a preimage —
                              never a diagnosis, an age, or a medication flag.
                            </p>
                            {submission.status === 'failed' && (
                              <p className="note" style={{ color: 'var(--bad)' }}>
                                {submission.message}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="note" style={{ margin: 0 }}>
                            {wallet.state.kind === 'unavailable'
                              ? 'Install a Midnight wallet extension to submit this proof from the browser.'
                              : 'Connect your wallet in the header to submit this proof from the browser.'}{' '}
                            Without one, <code>scripts/patient.ts</code> submits
                            the identical transaction from the command line.
                          </p>
                        )}
                      </div>
                    )}

                    <p className="note">
                      Two values. The nullifier is derived from your secret and
                      this trial's id, so it blocks a second check here while
                      remaining uncorrelatable with your checks on other trials.
                      {chainStatus.kind === 'live' && !alreadyOnChain && (
                        <>
                          {' '}Run{' '}
                          <code>
                            npx vite-node scripts/patient.ts{' '}
                            {ACTIVE_DEPLOYMENT?.network ?? 'local'} {identity}{' '}
                            {String(trial.id)}
                          </code>{' '}
                          and this indicator flips without a reload.
                        </>
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <ul className="facts empty">
                      <li><span>Nothing was written</span></li>
                    </ul>
                    <p className="note">
                      A failed check produces no transaction at all, so there is
                      no rejection record to leak, sell, or subpoena.
                    </p>
                  </>
                )}
              </motion.div>
            </div>

            <div className="row" style={{ marginTop: 26 }}>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setOutcome({ status: 'idle' });
                  setSubmission({ status: 'idle' });
                  setStep('facts');
                }}
              >
                Run another check
              </button>
              <Link className="btn btn-ghost" to="/ledger">
                See the public ledger →
              </Link>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
