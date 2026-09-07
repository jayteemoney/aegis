import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal';

const CIRCUIT_STEPS = [
  {
    n: 1,
    title: 'Your facts enter as witnesses',
    body:
      'Compact witnesses are callbacks the prover invokes to obtain private inputs. They read from local state on your device. Nothing is transmitted — the values exist only inside the proof.',
    tone: 'private' as const,
  },
  {
    n: 2,
    title: 'The circuit checks an issuer attested them',
    body:
      'It recomputes a blinded commitment from your facts and a secret nonce, then asserts that commitment is one a clinic already published. You cannot invent your own health data.',
    tone: 'private' as const,
  },
  {
    n: 3,
    title: 'The trial predicates are asserted',
    body:
      'Diagnosis equals the required condition, AND age falls inside the band, AND no excluding medication. A failed assertion makes the proof unsatisfiable — there is nothing to submit.',
    tone: 'private' as const,
  },
  {
    n: 4,
    title: 'A nullifier is derived',
    body:
      'Hashed from your secret key and the trial id. Stable within one trial so it blocks replay, different across trials so your checks cannot be correlated.',
    tone: 'private' as const,
  },
  {
    n: 5,
    title: 'Only the result is disclosed',
    body:
      'disclose() is the single crossing point. The nullifier and the boolean go on chain. Every other value stays behind.',
    tone: 'public' as const,
  },
];

export function HowItWorks() {
  return (
    <div className="wrap">
      <p className="eyebrow">The mechanism</p>
      <h1 style={{ fontSize: 'clamp(30px,4.6vw,46px)' }}>
        How a proof replaces a disclosure
      </h1>
      <p className="lede" style={{ marginTop: 18 }}>
        Aegis is one Compact contract. The interesting part is not what it
        computes but where the boundary sits — and that the compiler, not a
        code review, is what enforces it.
      </p>

      <section className="section">
        <h2>The flow</h2>
        <div className="card" style={{ overflowX: 'auto' }}>
          <pre
            className="mono"
            style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--muted)' }}
          >{`┌──────────────── your device ─────────────────┐
│  private state          witnesses            │
│  ├─ diagnosis     ──►  patientDiagnosis()    │
│  ├─ age           ──►  patientAge()          │
│  ├─ medication    ──►  patientOnExcluded…()  │
│  ├─ record nonce  ──►  patientRecordNonce()  │
│  └─ secret key    ──►  patientSecretKey()    │
│                            │                 │
│                            ▼                 │
│                 ┌─────────────────────┐      │
│                 │ checkTrialEligibility│     │
│                 │   (Compact circuit)  │     │
│                 └──────────┬──────────┘      │
└────────────────────────────┼─────────────────┘
                             │  disclose()
                             ▼
┌──────────────── public ledger ───────────────┐
│  trials:             id → criteria           │
│  attestedRecords:    { blinded commitments } │
│  eligibilityResults: nullifier → true        │
│  checksPerformed:    counter                 │
└──────────────────────────────────────────────┘`}</pre>
        </div>
      </section>

      <section className="section">
        <h2>Inside the circuit</h2>
        <p className="lede">Five steps, in order, every time.</p>
        <div className="grid">
          {CIRCUIT_STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06}>
              <div className={`panel ${s.tone}`}>
                <span className={`tag ${s.tone}`}>
                  {s.tone === 'private' ? '🔒 stays private' : '🌐 becomes public'}
                </span>
                <h3>
                  {s.n}. {s.title}
                </h3>
                <p>{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Why the compiler matters</h2>
        <p className="lede">
          In an ordinary application, "we don't log sensitive fields" is a
          promise enforced by discipline. In Compact it is a type error.
        </p>
        <div className="card">
          <pre
            className="mono"
            style={{ margin: 0, fontSize: 13, lineHeight: 1.7, overflowX: 'auto' }}
          >{`// This does not compile. The compiler rejects it.
eligibilityResults.insert(nullifier, true);

// This does. The disclosure is explicit and auditable.
eligibilityResults.insert(disclose(nullifier), true);`}</pre>
        </div>
        <p className="note">
          Every <code>disclose()</code> in the contract is a deliberate,
          reviewable decision. There are exactly four in Aegis, and you can read
          them all in <code>contracts/aegis.compact</code>.
        </p>
      </section>

      <section className="section">
        <h2>What Wave 1 does not yet do</h2>
        <div className="banner">
          <span>⚠</span>
          <div>
            <strong>Stated plainly, because the roadmap depends on it.</strong>
            <br />
            The issuer trust check is a hash match against a public set, not a
            real signature — Wave 2 replaces it with in-circuit Schnorr
            verification. And proving eligibility discloses <em>which</em>{' '}
            attested commitment was used, so the issuer that registered it could
            link a check back to a patient. The health facts stay private
            regardless. Wave 3 swaps set membership for a Merkle proof, which
            removes the disclosure entirely.
          </div>
        </div>
        <div className="row">
          <Link className="btn btn-primary" to="/prove">
            Try an eligibility check
          </Link>
          <Link className="btn btn-ghost" to="/ledger">
            Inspect the public ledger
          </Link>
        </div>
      </section>
    </div>
  );
}
