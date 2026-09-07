import { Link } from 'react-router-dom';
import { conditionLabel, DEMO_PATIENTS, DEMO_TRIALS } from '@aegis/demo-data';

import { useChain } from '../chain/ChainProvider';
import { ActivityFeed } from '../components/ActivityFeed';
import { DeployPanel } from '../components/DeployPanel';
import { Reveal } from '../components/Reveal';
import { ACTIVE_DEPLOYMENT } from '../deployment';

const short = (hex: string) => `${hex.slice(0, 18)}…${hex.slice(-10)}`;

const Command = ({ children }: { children: string }) => (
  <pre className="cmd">{children}</pre>
);

/**
 * The operator console.
 *
 * Sponsors and issuers are the two roles that write public data. Their inputs
 * are already public or already blinded, so unlike the patient they lose
 * nothing by acting through a server — which is exactly how a real deployment
 * would run them. This page shows what each has written and how to write more.
 */
export function Registry() {
  const { status, state: chain, events } = useChain();
  const network = ACTIVE_DEPLOYMENT?.network ?? 'local';

  const registered = new Set((chain?.trials ?? []).map((t) => String(t.id)));
  const unregistered = DEMO_TRIALS.filter((t) => !registered.has(String(t.id)));

  return (
    <div className="wrap">
      <p className="eyebrow">Operators</p>
      <h1 style={{ fontSize: 'clamp(30px,4.6vw,46px)' }}>Sponsors and issuers</h1>
      <p className="lede" style={{ marginTop: 18 }}>
        Two roles write to the Aegis ledger, and neither of them ever handles a
        patient's health data. A sponsor publishes criteria. An issuer publishes
        a blinded commitment. Everything below is live contract state.
      </p>

      <div className="row" style={{ margin: '22px 0 30px' }}>
        <span className="chip">
          <span
            className={`dot ${status.kind === 'live' ? 'live' : status.kind === 'error' ? 'bad' : 'warn'}`}
          />
          {status.kind === 'live'
            ? `live · ${network}`
            : status.kind === 'error'
              ? status.message
              : status.kind === 'connecting'
                ? 'connecting…'
                : 'no deployment found'}
        </span>
        {ACTIVE_DEPLOYMENT && (
          <span className="chip mono" title={ACTIVE_DEPLOYMENT.contractAddress}>
            {ACTIVE_DEPLOYMENT.contractAddress.slice(0, 12)}…
            {ACTIVE_DEPLOYMENT.contractAddress.slice(-6)}
          </span>
        )}
      </div>

      <section className="section">
        <div className="grid cols-2">
          <Reveal>
            <div className="panel public" style={{ height: '100%' }}>
              <span className="tag public">registerTrial</span>
              <h3>Sponsor — publish criteria</h3>
              <p>
                A condition code and an age band, written openly to the ledger.
                There is nothing to protect here: recruiting requires saying what
                you are recruiting for.
              </p>
              <ul className="facts">
                <li>
                  <span>On chain now</span>
                  <code>{chain ? `${chain.trials.length} trial(s)` : '—'}</code>
                </li>
                <li>
                  <span>Discloses</span>
                  <code>conditionCode, minAge, maxAge</code>
                </li>
                <li>
                  <span>Learns about patients</span>
                  <code>nothing</code>
                </li>
              </ul>
              <Command>{`npx vite-node scripts/deploy.ts ${network}`}</Command>
              <p className="note">
                The deploy script registers the three demo trials. Adding a
                fourth means one more <code>registerTrial</code> call with the
                sponsor's own criteria.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.07}>
            <div className="panel private" style={{ height: '100%' }}>
              <span className="tag private">attestPatientRecord</span>
              <h3>Issuer — attest a record</h3>
              <p>
                A clinic computes a commitment over the patient's record and a
                secret nonce, then publishes only that hash. It is the clinic
                vouching for facts it will never restate.
              </p>
              <ul className="facts">
                <li>
                  <span>On chain now</span>
                  <code>{chain ? `${chain.attestedRecordCount} record(s)` : '—'}</code>
                </li>
                <li>
                  <span>Discloses</span>
                  <code>one 32-byte commitment</code>
                </li>
                <li>
                  <span>Reversible without the nonce</span>
                  <code>no</code>
                </li>
              </ul>
              <Command>{`npx vite-node scripts/deploy.ts ${network}`}</Command>
              <p className="note">
                The same script attests the {DEMO_PATIENTS.length} demo records,
                which is what gives a patient's later proof its credibility.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <DeployPanel />
      </section>

      <section className="section">
        <h2>Registered trials</h2>
        {chain && chain.trials.length > 0 ? (
          <ul className="feed">
            {chain.trials.map((t) => {
              const meta = DEMO_TRIALS.find((d) => d.id === t.id);
              return (
                <li key={String(t.id)}>
                  <span className="tag public">#{String(t.id)}</span>
                  <div className="activity-body">
                    <strong>{meta?.name ?? `Trial #${t.id}`}</strong>
                    <span className="mono">
                      {conditionLabel(t.criteria.conditionCode)} · ages{' '}
                      {String(t.criteria.minAge)}–{String(t.criteria.maxAge)}
                    </span>
                  </div>
                  <span className="ok" style={{ marginLeft: 'auto' }}>on chain ✓</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card" style={{ textAlign: 'center', color: 'var(--faint)' }}>
            {status.kind === 'live'
              ? 'No trials registered on this contract yet.'
              : 'Waiting for chain data…'}
          </div>
        )}
        {unregistered.length > 0 && chain && (
          <p className="note">
            {unregistered.length} demo trial(s) defined locally are not on this
            contract: {unregistered.map((t) => t.name).join(', ')}.
          </p>
        )}
      </section>

      <section className="section">
        <h2>Published attestations</h2>
        <p className="lede">
          The complete set, exactly as stored. A commitment is all the circuit
          needs — it checks membership, never contents.
        </p>
        {chain && chain.attestations.length > 0 ? (
          <ul className="feed">
            {chain.attestations.map((c) => (
              <li key={c}>
                <span className="tag private">commitment</span>
                <code title={c}>{short(c)}</code>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card" style={{ textAlign: 'center', color: 'var(--faint)' }}>
            {status.kind === 'live'
              ? 'No attestations published yet.'
              : 'Waiting for chain data…'}
          </div>
        )}
      </section>

      <section className="section">
        <h2>Patient checks</h2>
        <p className="lede">
          The third circuit, <code>checkTrialEligibility</code>, is the patient's
          and belongs on the patient's device. In Wave 1 you can run it against
          the deployed contract from the command line — a real proof, a real
          transaction — and watch the result arrive in the feed below.
        </p>
        <div className="card">
          <Command>{`npx vite-node scripts/patient.ts ${network} ada 1`}</Command>
          <p style={{ color: 'var(--muted)', margin: '12px 0 0' }}>
            Known patients: {DEMO_PATIENTS.map((p) => p.id).join(', ')}. Omit the
            patient and trial arguments to try every combination — the ones who
            do not qualify are refused by the circuit before a transaction is
            ever built.
          </p>
        </div>
      </section>

      <section className="section">
        <h2>Contract activity</h2>
        <ActivityFeed
          events={events}
          limit={10}
          empty={
            status.kind === 'live'
              ? 'Connected. Nothing has changed since this page opened.'
              : 'Waiting for chain data…'
          }
        />
        <div className="row" style={{ marginTop: 18 }}>
          <Link className="btn btn-ghost btn-sm" to="/ledger">
            Full ledger view →
          </Link>
          <Link className="btn btn-ghost btn-sm" to="/prove">
            Try a patient check →
          </Link>
        </div>
      </section>
    </div>
  );
}
