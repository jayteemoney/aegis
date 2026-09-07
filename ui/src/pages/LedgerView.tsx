import { AnimatePresence, motion } from 'motion/react';
import { Link } from 'react-router-dom';

import { ACTIVE_DEPLOYMENT, HIDDEN_LOCAL_DEPLOYMENT } from '../deployment';
import { useChain } from '../chain/ChainProvider';
import { ActivityFeed } from '../components/ActivityFeed';

const short = (hex: string) => `${hex.slice(0, 16)}…${hex.slice(-12)}`;

/**
 * The adversary's view.
 *
 * Everything on this page is what a fully-informed observer of the Midnight
 * ledger can see about Aegis. The argument the project is making is that this
 * page is boring — and that it stays boring no matter how many people use it.
 */
export function LedgerView() {
  const { status, events, state: live } = useChain();

  const statusLabel =
    status.kind === 'live'
      ? 'streaming live'
      : status.kind === 'connecting'
        ? 'connecting…'
        : status.kind === 'error'
          ? status.message
          : 'no deployment yet';

  const dot =
    status.kind === 'live'
      ? 'live'
      : status.kind === 'connecting'
        ? 'warn'
        : status.kind === 'error'
          ? 'bad'
          : '';

  return (
    <div className="wrap">
      <p className="eyebrow">Public ledger</p>
      <h1 style={{ fontSize: 'clamp(30px,4.6vw,46px)' }}>Everything the world can see</h1>
      <p className="lede" style={{ marginTop: 18 }}>
        This is the complete on-chain state of the Aegis contract, streamed from
        the Midnight indexer. Not a summary — the whole thing.
      </p>

      <div className="row" style={{ margin: '22px 0 28px' }}>
        <span className="chip">
          <span className={`dot ${dot}`} />
          {statusLabel}
        </span>
        {ACTIVE_DEPLOYMENT && (
          <span className="chip mono" title={ACTIVE_DEPLOYMENT.contractAddress}>
            {ACTIVE_DEPLOYMENT.contractAddress.slice(0, 14)}…
            {ACTIVE_DEPLOYMENT.contractAddress.slice(-8)}
          </span>
        )}
        {status.kind === 'live' && (
          <span className="chip" title="When this browser last received a ledger snapshot">
            updated {new Date(status.lastUpdate).toLocaleTimeString()}
          </span>
        )}
      </div>

      {status.kind === 'undeployed' && (
        <div className="banner">
          <span>ℹ</span>
          <div>
            {HIDDEN_LOCAL_DEPLOYMENT ? (
              <>
                <strong>This hosted build has no chain to read.</strong>
                <br />
                The contract is deployed to a local Midnight devnet, which by
                definition only exists on the machine running it — so this page
                is empty here and full when you run the project yourself. The{' '}
                <Link to="/prove">eligibility checker</Link> works regardless:
                it executes the real compiled circuit in your browser, and that
                is the part worth seeing.
              </>
            ) : (
              <>
                <strong>No deployment record found.</strong>
                <br />
                Deploy the contract with <code>yarn deploy:local</code> and this
                page will populate from chain. Until then the eligibility
                checker still works — it runs the real circuit locally.
              </>
            )}
          </div>
        </div>
      )}

      <div className="stats">
        <div className="stat public">
          <div className="k">Trials registered</div>
          <div className="v">{live ? live.trials.length : '—'}</div>
        </div>
        <div className="stat public">
          <div className="k">Attested records</div>
          <div className="v">{live ? String(live.attestedRecordCount) : '—'}</div>
        </div>
        <div className="stat public">
          <div className="k">Checks performed</div>
          <div className="v">{live ? String(live.checksPerformed) : '—'}</div>
        </div>
        <div className="stat private">
          <div className="k">Health facts visible</div>
          <div className="v">0</div>
        </div>
      </div>

      <section className="section">
        <h2>Live activity</h2>
        <p className="lede">
          Compact contracts have no event log — a circuit's only observable
          effect is the state it leaves behind. So this feed is reconstructed by
          diffing consecutive ledger snapshots, which means every line is
          something you could derive yourself from public data. Nothing is
          reported here that the chain does not already say out loud.
        </p>
        <ActivityFeed
          events={events}
          limit={14}
          empty={
            live
              ? 'Connected. Nothing has changed on chain since this page opened.'
              : 'Waiting for chain data…'
          }
        />
      </section>

      <section className="section">
        <h2>Eligibility results</h2>
        <p className="lede">
          One row per successful check. The key is a nullifier; the value is the
          outcome. There is no patient column because there is no patient
          identity — nothing here can be traced back to a person, and nothing
          reveals which trial criteria were met beyond the fact that they were.
        </p>

        {live && live.results.length > 0 ? (
          <ul className="feed">
            <AnimatePresence initial={false}>
              {live.results.map((r) => (
                <motion.li
                  key={r.nullifier}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="tag public">nullifier</span>
                  <code>{r.nullifier}</code>
                  <span className="ok" style={{ marginLeft: 'auto' }}>
                    {r.eligible ? 'eligible ✓' : 'false'}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <div className="card" style={{ textAlign: 'center', color: 'var(--faint)' }}>
            {live
              ? 'No eligibility checks recorded yet.'
              : 'Waiting for chain data…'}
          </div>
        )}
      </section>

      <section className="section">
        <h2>Attestations</h2>
        <p className="lede">
          Blinded commitments published by issuers. Each is a commitment over a
          patient record and a secret nonce — computationally useless to anyone
          without the nonce, and listed here in full so you can check that for
          yourself.
        </p>
        {live && live.attestations.length > 0 ? (
          <ul className="feed">
            <AnimatePresence initial={false}>
              {live.attestations.map((c) => (
                <motion.li
                  key={c}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="tag private">commitment</span>
                  <code title={c}>{short(c)}</code>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <div className="card" style={{ textAlign: 'center', color: 'var(--faint)' }}>
            {live ? 'No records attested yet.' : 'Waiting for chain data…'}
          </div>
        )}
      </section>

      <section className="section">
        <div className="panel private">
          <span className="tag private">🔒 what is provably absent</span>
          <h3>Not on this page, and not anywhere on chain</h3>
          <ul className="facts">
            <li><span>Any diagnosis code</span><code>never disclosed</code></li>
            <li><span>Any patient age</span><code>never disclosed</code></li>
            <li><span>Any medication flag</span><code>never disclosed</code></li>
            <li><span>Any link between a person and a nullifier</span><code>never disclosed</code></li>
          </ul>
          <p className="note">
            This is not an access-control policy that could be misconfigured.
            The values were never in a transaction to begin with.
          </p>
        </div>
      </section>
    </div>
  );
}
