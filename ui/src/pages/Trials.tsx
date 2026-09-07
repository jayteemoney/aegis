import { Link } from 'react-router-dom';
import { conditionLabel, DEMO_TRIALS } from '@aegis/demo-data';
import { Reveal } from '../components/Reveal';
import { useChain } from '../chain/ChainProvider';

/**
 * The trial registry, read from chain when a deployment exists.
 *
 * Trial criteria are public by design, so this page needs no wallet and no
 * private state — it is exactly what any observer of the ledger can see.
 */
export function Trials() {
  const { status, state } = useChain();

  const onChain = state?.trials ?? [];
  const usingChain = onChain.length > 0;

  // Names and blurbs are presentation only; the criteria shown are always the
  // on-chain values when we have them.
  const rows = usingChain
    ? onChain.map((t) => {
        const meta = DEMO_TRIALS.find((d) => d.id === t.id);
        return {
          id: t.id,
          name: meta?.name ?? `Trial #${t.id}`,
          sponsor: meta?.sponsor ?? 'Unknown sponsor',
          summary: meta?.summary ?? 'Registered directly on chain.',
          criteria: t.criteria,
        };
      })
    : DEMO_TRIALS;

  return (
    <div className="wrap">
      <p className="eyebrow">Public registry</p>
      <h1 style={{ fontSize: 'clamp(30px,4.6vw,46px)' }}>Open trials</h1>
      <p className="lede" style={{ marginTop: 18 }}>
        Sponsors publish what they require in the open. This is the public half
        of the model — and the only half a patient ever has to read.
      </p>

      <div className="row" style={{ margin: '22px 0 30px' }}>
        <span className="chip">
          <span className={`dot ${usingChain ? 'live' : ''}`} />
          {usingChain
            ? `${rows.length} trials read from the ledger`
            : status.kind === 'connecting'
              ? 'connecting to the indexer…'
              : 'showing local fixtures — no deployment found'}
        </span>
      </div>

      <div className="grid">
        {rows.map((t, i) => (
          <Reveal key={String(t.id)} delay={i * 0.06}>
            <div className="trial">
              <span className="tag public">🌐 public</span>
              <strong style={{ marginTop: 12 }}>{t.name}</strong>
              <span className="sponsor">{t.sponsor}</span>
              <p>{t.summary}</p>
              <dl className="criteria">
                <div>
                  <dt>Condition</dt>
                  <dd>{conditionLabel(t.criteria.conditionCode)}</dd>
                </div>
                <div>
                  <dt>Age band</dt>
                  <dd>
                    {String(t.criteria.minAge)}–{String(t.criteria.maxAge)}
                  </dd>
                </div>
                <div>
                  <dt>Excluded medication</dt>
                  <dd>Not permitted</dd>
                </div>
                <div>
                  <dt>Trial id</dt>
                  <dd className="mono">#{String(t.id)}</dd>
                </div>
              </dl>
            </div>
          </Reveal>
        ))}
      </div>

      <section className="section">
        <div className="card">
          <h3 style={{ marginBottom: 8 }}>What a sponsor never receives</h3>
          <p style={{ color: 'var(--muted)' }}>
            Publishing criteria costs a sponsor nothing in privacy terms — the
            asymmetry is the point. They state a requirement; you return a proof.
            At no stage does a diagnosis, an age or a medication list travel
            toward them.
          </p>
          <div className="row" style={{ marginTop: 18 }}>
            <Link className="btn btn-primary btn-sm" to="/prove">
              Check eligibility →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
