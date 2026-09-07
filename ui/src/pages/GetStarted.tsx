import { Reveal } from '../components/Reveal';
import { ACTIVE_DEPLOYMENT } from '../deployment';

const AUDIENCES = [
  {
    tag: 'Patients',
    tone: 'private' as const,
    title: 'Check a trial without giving anything up',
    body:
      'Open the eligibility checker, enter your facts, and pick a trial. The proof runs in your browser. Nothing is uploaded, and you can close the tab at any point with no trace left behind.',
    cta: { to: '/prove', label: 'Check eligibility' },
  },
  {
    tag: 'Clinics & issuers',
    tone: 'public' as const,
    title: 'Attest a record without publishing it',
    body:
      'An issuer computes a blinded commitment over a patient record and registers that hash on chain. The commitment is what gives the patient\'s later proof its credibility, and it discloses nothing on its own.',
    cta: { to: '/how-it-works', label: 'See the mechanism' },
  },
  {
    tag: 'Sponsors',
    tone: 'public' as const,
    title: 'Recruit without becoming a data custodian',
    body:
      'Publish your criteria and read eligibility results off the ledger. You never receive protected health information, which means you never have to secure it, retain it, or answer for it.',
    cta: { to: '/trials', label: 'Browse trials' },
  },
];

const STEPS = [
  {
    n: 1,
    title: 'Install the toolchain',
    code: `curl --proto '=https' --tlsv1.2 -LsSf \\
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
compact update`,
    note: 'Needs Node 24+ and Docker. Verify with `compact compile --version` — Aegis is built against 0.31.1 / language 0.23.',
  },
  {
    n: 2,
    title: 'Compile the contract',
    code: `git clone <your-fork>/aegis && cd aegis
yarn install
yarn compile`,
    note: 'Produces contracts/managed/aegis with the ZK proving and verifying keys.',
  },
  {
    n: 3,
    title: 'Run the tests',
    code: `npx vitest run src/test/simulator.test.ts   # fast, no devnet
yarn env:up && yarn test:local              # full devnet run`,
    note: 'The fast suite runs the real circuit in-process. The devnet suite deploys it and proves the same behaviour on chain.',
  },
  {
    n: 4,
    title: 'Deploy to the local devnet',
    code: `yarn env:up                                  # node, indexer, proof server
yarn deploy:local`,
    note: 'Deploys the contract, registers the demo trials and attests the demo records. Writes deployments/local.json, which is what the interface reads. No faucet and no DUST delegation — the dev chain preset funds its genesis account.',
  },
  {
    n: 5,
    title: 'Start the interface',
    code: `cd ui && npm install && npm run dev`,
    note: 'Serves on localhost:5173 and connects to the deployment automatically. The ledger page streams live contract state over a websocket.',
  },
  {
    n: 6,
    title: 'Prove eligibility on chain',
    code: `yarn patient ada 1`,
    note: 'A genuine proof and a genuine transaction. Leave the ledger page open while it runs and the nullifier arrives in the activity feed on its own.',
  },
];

export function GetStarted() {
  return (
    <div className="wrap">
      <p className="eyebrow">Onboarding</p>
      <h1 style={{ fontSize: 'clamp(30px,4.6vw,46px)' }}>Get started</h1>
      <p className="lede" style={{ marginTop: 18 }}>
        Aegis has three sides. Whichever one you are on, you never handle
        somebody else's health data.
      </p>

      <section className="section">
        <div className="grid cols-3">
          {AUDIENCES.map((a, i) => (
            <Reveal key={a.tag} delay={i * 0.07}>
              <div className={`panel ${a.tone}`} style={{ height: '100%' }}>
                <span className={`tag ${a.tone}`}>{a.tag}</span>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
                <a className="btn btn-ghost btn-sm" href={a.cta.to} style={{ marginTop: 16 }}>
                  {a.cta.label} →
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Run it yourself</h2>
        <p className="lede">
          From a clean machine to a contract deployed on a local Midnight chain,
          with the interface reading its state live.
        </p>

        <div className="grid">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.05}>
              <div className="card">
                <div className="row" style={{ gap: 11, marginBottom: 12 }}>
                  <span className="num" style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--public)', color: '#041424',
                    display: 'grid', placeItems: 'center',
                    fontSize: 13, fontWeight: 700,
                  }}>{s.n}</span>
                  <h3 style={{ margin: 0, fontSize: 17 }}>{s.title}</h3>
                </div>
                <pre className="mono" style={{
                  margin: 0, padding: 14, borderRadius: 10, overflowX: 'auto',
                  background: 'var(--bg-elev)', border: '1px solid var(--line)',
                  fontSize: 12.5, lineHeight: 1.65, color: 'var(--text)',
                }}>{s.code}</pre>
                <p className="note">{s.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Deploying to a public testnet</h2>
        <p className="lede">
          The local devnet above needs no wallet at all, which is why it is the
          path the tests use. A public testnet is deployed to from the browser
          instead — not for convenience, but because it is the only thing that
          works.
        </p>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Why there is no deploy script for testnet</h3>
          <p style={{ color: 'var(--muted)' }}>
            A headless wallet keeps no persisted DUST state, so it rescans the
            chain from genesis on every run. On preprod that is over a day of
            wall clock, and it recurs for every command. A browser wallet stays
            synced in the background and never cold-starts, so it does in
            seconds what the script cannot do in a day.
          </p>
          <ol style={{ color: 'var(--muted)', paddingLeft: 20, lineHeight: 1.9 }}>
            <li>Install a Midnight wallet extension and point it at your network.</li>
            <li>Fund its address from that network's faucet.</li>
            <li>Register the NIGHT for DUST generation, in the wallet's own UI.</li>
            <li>Connect it here, then deploy from the <a href="/registry">Operators</a> page.</li>
          </ol>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            <strong style={{ color: 'var(--private)' }}>tNIGHT alone is not enough.</strong>{' '}
            Contract calls pay fees in DUST, which only accrues from NIGHT you
            have registered. A wallet holding only tNIGHT fails at submission
            with an error that never mentions DUST.
          </p>
        </div>
      </section>

      <section className="section">
        <h2>Current deployment</h2>
        <div className="card">
          {ACTIVE_DEPLOYMENT ? (
            <ul className="facts">
              <li><span>Network</span><code>{ACTIVE_DEPLOYMENT.network}</code></li>
              <li><span>Contract</span><code style={{ wordBreak: 'break-all' }}>{ACTIVE_DEPLOYMENT.contractAddress}</code></li>
              <li><span>Deployed</span><code>{new Date(ACTIVE_DEPLOYMENT.deployedAt).toLocaleString()}</code></li>
              <li><span>Indexer</span><code style={{ wordBreak: 'break-all' }}>{ACTIVE_DEPLOYMENT.indexer}</code></li>
            </ul>
          ) : (
            <p style={{ color: 'var(--muted)', margin: 0 }}>
              No deployment record is committed yet. The interface falls back to
              running the circuit locally, which exercises identical contract
              logic — only the transaction submission is missing.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
