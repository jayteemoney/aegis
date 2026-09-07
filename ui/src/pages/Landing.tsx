import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Reveal } from '../components/Reveal';
import { ActivityFeed } from '../components/ActivityFeed';
import { useChain } from '../chain/ChainProvider';

export function Landing() {
  const { state: live, events, status } = useChain();

  return (
    <div className="wrap">
      <section className="hero">
        <motion.p
          className="eyebrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          Zero-knowledge clinical trial matching
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          Prove you qualify.
          <br />
          Reveal nothing.
        </motion.h1>

        <motion.p
          className="lede"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          Clinical-trial recruitment makes patients hand over their diagnosis,
          age and medication history just to ask whether they're eligible. Most
          never enrol — their records were exposed for nothing. Aegis inverts
          that: your health facts never leave your device, and the sponsor
          learns a single bit.
        </motion.p>

        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
        >
          <Link className="btn btn-primary" to="/prove">
            Check your eligibility →
          </Link>
          <Link className="btn btn-ghost" to="/how-it-works">
            How it works
          </Link>
        </motion.div>
      </section>

      <section className="section">
        <div className="stats">
          {[
            { k: 'Trials on chain', v: live ? String(live.trials.length) : '—', cls: 'public' },
            {
              k: 'Attested records',
              v: live ? String(live.attestedRecordCount) : '—',
              cls: 'public',
            },
            {
              k: 'Eligibility checks',
              v: live ? String(live.checksPerformed) : '—',
              cls: 'public',
            },
            { k: 'Health facts disclosed', v: '0', cls: 'private' },
          ].map((s, i) => (
            <Reveal key={s.k} delay={i * 0.06}>
              <div className={`stat ${s.cls}`}>
                <div className="k">{s.k}</div>
                <div className="v">{s.v}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="note">
          The first three are read live from the Midnight ledger. The fourth is
          not a marketing claim — it is a property the Compact compiler
          enforces, and you can verify it on the{' '}
          <Link to="/ledger">ledger page</Link>.
        </p>
      </section>

      <section className="section">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ margin: 0 }}>Happening on chain</h2>
          <span className="chip">
            <span
              className={`dot ${status.kind === 'live' ? 'live' : status.kind === 'error' ? 'bad' : 'warn'}`}
            />
            {status.kind === 'live'
              ? 'streaming from the indexer'
              : status.kind === 'connecting'
                ? 'connecting…'
                : status.kind === 'error'
                  ? 'indexer unreachable'
                  : 'no deployment yet'}
          </span>
        </div>
        <p className="lede" style={{ marginBottom: 22 }}>
          The contract's whole public history, as anyone can read it. Notice
          what these rows never say: who, what condition, what age.
        </p>
        <ActivityFeed
          events={events}
          limit={5}
          empty={
            status.kind === 'live'
              ? 'Connected. Nothing has changed since this page opened.'
              : 'Deploy the contract to see live ledger activity here.'
          }
        />
        <div className="row" style={{ marginTop: 18 }}>
          <Link className="btn btn-ghost btn-sm" to="/ledger">
            Read the full ledger →
          </Link>
        </div>
      </section>

      <section className="section">
        <h2>The trade patients are forced to make</h2>
        <p className="lede">
          Today, eligibility screening is a one-way disclosure. Aegis replaces it
          with a proof.
        </p>

        <div className="grid cols-2">
          <Reveal>
            <div className="card">
              <span className="tag private">Today</span>
              <h3 style={{ marginTop: 14 }}>Hand over everything, hope for the best</h3>
              <p>
                A patient submits diagnosis, age, medication list and often their
                full record to a sponsor's screening portal. If they don't
                qualify — the common case — the data was surrendered for nothing,
                and it does not come back.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="card" style={{ borderColor: 'var(--public-line)' }}>
              <span className="tag public">With Aegis</span>
              <h3 style={{ marginTop: 14 }}>Prove the criteria, disclose the answer</h3>
              <p>
                The patient's device runs a zero-knowledge circuit over facts
                that never leave it. What reaches the sponsor is an eligibility
                bit and an anti-replay nullifier. If they don't qualify, no
                transaction exists at all.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <h2>Three steps, one disclosure</h2>
        <p className="lede">
          The whole protocol, end to end. Only the third step touches the chain.
        </p>

        <div className="flow">
          {[
            {
              n: '01',
              tone: 'private' as const,
              title: 'A clinic attests your record',
              body:
                'Your issuer computes a commitment over your record and a secret nonce, and publishes only that hash. It vouches for facts it never restates.',
            },
            {
              n: '02',
              tone: 'private' as const,
              title: 'Your device proves the criteria',
              body:
                'The circuit reads your facts as witnesses, checks them against the trial, and confirms the commitment matches one an issuer attested. All of it local.',
            },
            {
              n: '03',
              tone: 'public' as const,
              title: 'The ledger records one bit',
              body:
                'A nullifier maps to true. No diagnosis, no age, no medication, no identity — and nothing at all if you did not qualify.',
            },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className={`flow-step ${s.tone}`}>
                <span className="flow-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Built on Midnight's dual-ledger model</h2>
        <p className="lede">
          Midnight splits state into a private side that stays with the user and
          a public ledger on chain. Compact — the contract language — refuses to
          let a private value reach public state without an explicit{' '}
          <code>disclose()</code>. Aegis is an argument that this is the right
          shape for health data.
        </p>

        <div className="grid cols-2">
          <Reveal>
            <div className="panel private">
              <span className="tag private">🔒 Never leaves your device</span>
              <ul className="facts">
                <li><span>Diagnosis code</span><code>witness</code></li>
                <li><span>Age</span><code>witness</code></li>
                <li><span>Excluded-medication flag</span><code>witness</code></li>
                <li><span>Record blinding nonce</span><code>witness</code></li>
                <li><span>Patient secret key</span><code>witness</code></li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="panel public">
              <span className="tag public">🌐 Public on the ledger</span>
              <ul className="facts">
                <li><span>Trial criteria</span><code>published by sponsor</code></li>
                <li><span>Issuer attestations</span><code>blinded hashes</code></li>
                <li><span>Eligibility outcome</span><code>nullifier → true</code></li>
                <li><span>Check counter</span><code>integer</code></li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <h2>Three sides, one asymmetry</h2>
        <p className="lede">
          Nobody in this system has to hold somebody else's health data — not
          even the people who depend on it.
        </p>

        <div className="grid cols-3">
          {[
            {
              tag: 'Patients',
              tone: 'private' as const,
              title: 'Ask without surrendering',
              body:
                'Check as many trials as you like. Each check is uncorrelatable with the last, and a failed one leaves no trace at all.',
              to: '/prove',
              cta: 'Check eligibility',
            },
            {
              tag: 'Clinics',
              tone: 'public' as const,
              title: 'Vouch without publishing',
              body:
                'Attest a blinded commitment. You confirm a record is genuine without ever restating what it contains, and you keep no new liability.',
              to: '/registry',
              cta: 'See the issuer role',
            },
            {
              tag: 'Sponsors',
              tone: 'public' as const,
              title: 'Recruit without custody',
              body:
                'Publish criteria, read results. You never receive protected health information, so you never have to secure it, retain it, or answer for it.',
              to: '/trials',
              cta: 'Browse trials',
            },
          ].map((a, i) => (
            <Reveal key={a.tag} delay={i * 0.07}>
              <div className={`panel ${a.tone}`} style={{ height: '100%' }}>
                <span className={`tag ${a.tone}`}>{a.tag}</span>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
                <Link className="btn btn-ghost btn-sm" to={a.to} style={{ marginTop: 16 }}>
                  {a.cta} →
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>What it is actually made of</h2>
        <p className="lede">
          No mocks anywhere in the privacy path. The screen you use runs the same
          compiled circuit the chain enforces.
        </p>
        <div className="tech-grid">
          {[
            ['Compact 0.23', 'The ZK contract language. Its compiler rejects a private value reaching public state without disclose().'],
            ['Compiler 0.31.1', 'Produces the proving and verifying keys, and the JavaScript the runtime executes.'],
            ['midnight-js 4.1.1', 'Deployment, transaction balancing and the indexer subscription that streams state.'],
            ['WebAssembly', 'The compiled circuit runs in the browser — the same code, the same assertions.'],
            ['DApp Connector', 'A browser wallet proves, balances, signs and submits. It never receives a health fact.'],
            ['Vite + React 19', 'The interface, with live ledger state over a websocket.'],
          ].map(([k, v], i) => (
            <Reveal key={k} delay={i * 0.04}>
              <div className="tech">
                <strong>{k}</strong>
                <span>{v}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Frequently asked</h2>
        {[
          {
            q: "If my data never leaves, what stops me from lying about it?",
            a: 'A clinic or EHR issuer attests a blinded commitment to your record on chain. The circuit recomputes that commitment from your private facts and requires a match, so you can only prove things about data an issuer actually signed off on.',
          },
          {
            q: 'What does the sponsor actually see?',
            a: 'A nullifier — an opaque 32-byte value derived from your secret and the trial id — mapped to true. Nothing about your diagnosis, age or medication is recoverable from it, and it differs per trial so your checks cannot be linked together.',
          },
          {
            q: 'What happens when I am not eligible?',
            a: 'The proof becomes unsatisfiable, so no transaction is ever produced. There is no rejection record to leak. The sponsor does not learn that you tried and failed.',
          },
          {
            q: 'Is this production-ready?',
            a: 'No. This is a buildathon project running on a local Midnight devnet. The issuer trust check is currently a hash match rather than a real signature, and proving eligibility reveals which attested commitment was used. Both are documented and scheduled, along with why no public testnet deployment exists yet.',
          },
        ].map((f, i) => (
          <Reveal key={f.q} delay={i * 0.05}>
            <div className="faq">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="section">
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <h2 style={{ marginBottom: 10 }}>See it for yourself</h2>
          <p className="lede" style={{ margin: '0 auto 24px' }}>
            Run an eligibility check in your browser. The circuit executes
            locally; watch the ledger page in another tab to see exactly how
            little of it becomes public.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary" to="/prove">
              Start a check
            </Link>
            <Link className="btn btn-ghost" to="/get-started">
              Run it yourself
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
