import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { useWallet } from '../chain/WalletContext';
import { deployAegisFromBrowser } from '../chain/deploy';
import { ACTIVE_DEPLOYMENT, TARGET_NETWORK } from '../deployment';

type State =
  | { kind: 'idle' }
  | { kind: 'running'; step: string; detail?: string; log: string[] }
  | { kind: 'done'; json: string; address: string }
  | { kind: 'failed'; message: string; log: string[] };

/**
 * Deploying Aegis from the browser.
 *
 * The Node deploy script cannot reach a long-lived testnet in practice — a
 * headless wallet rescans from genesis on every run, which is over a day on
 * preprod. A browser wallet is always synced, so this is the workable route
 * and also the one a real operator would use.
 */
export function DeployPanel() {
  const wallet = useWallet();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);

  const alreadyDeployed = ACTIVE_DEPLOYMENT?.network === TARGET_NETWORK;

  async function run() {
    if (wallet.state.kind !== 'connected') return;
    const log: string[] = [];

    setState({ kind: 'running', step: 'Starting…', log });
    try {
      const { json, record } = await deployAegisFromBrowser({
        api: wallet.state.api,
        network: TARGET_NETWORK,
        onProgress: (step, detail) => {
          log.push(detail ? `${step} ${detail}` : step);
          setState({ kind: 'running', step, detail, log: [...log] });
        },
      });
      setState({ kind: 'done', json, address: record.contractAddress });
    } catch (err) {
      setState({
        kind: 'failed',
        message: err instanceof Error ? err.message : 'Deployment failed',
        log: [...log],
      });
    }
  }

  return (
    <div className="panel public">
      <span className="tag public">deploy</span>
      <h3>Put Aegis on {TARGET_NETWORK}</h3>
      <p>
        Deploys the contract, publishes the three trial criteria and attests the
        four demo records — eight transactions, each approved in your wallet.
        Nothing private is involved: trial criteria are public by design and an
        attestation is already a blinded commitment.
      </p>

      {alreadyDeployed && state.kind === 'idle' && (
        <div className="banner" style={{ marginTop: 16 }}>
          <span>ℹ</span>
          <div>
            A contract is already recorded for <strong>{TARGET_NETWORK}</strong>{' '}
            at <code>{ACTIVE_DEPLOYMENT?.contractAddress.slice(0, 16)}…</code>.
            Deploying again creates a second, independent one.
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {state.kind === 'running' && (
          <motion.div
            key="running"
            className="card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: 16 }}
          >
            <div className="row">
              <span className="spinner spinner-sm" />
              <strong>{state.step}</strong>
            </div>
            {state.detail && <p className="note" style={{ margin: '8px 0 0' }}>{state.detail}</p>}
            {state.log.length > 1 && (
              <pre className="cmd" style={{ marginTop: 14, maxHeight: 190, overflowY: 'auto' }}>
                {state.log.join('\n')}
              </pre>
            )}
          </motion.div>
        )}

        {state.kind === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 16 }}
          >
            <div className="card">
              <strong style={{ color: 'var(--ok)' }}>Deployed.</strong>
              <code className="hash public">{state.address}</code>
              <p className="note">
                Save the record below as{' '}
                <code>deployments/{TARGET_NETWORK}.json</code> in the repo, then
                reload. That file is how the interface finds the contract, and
                committing it is what lets anyone else see the same deployment.
              </p>
              <pre className="cmd" style={{ maxHeight: 240, overflowY: 'auto' }}>{state.json}</pre>
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => {
                  void navigator.clipboard.writeText(state.json).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
              >
                {copied ? 'Copied ✓' : 'Copy the deployment record'}
              </button>
            </div>
          </motion.div>
        )}

        {state.kind === 'failed' && (
          <motion.div
            key="failed"
            className="card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 16 }}
          >
            <strong style={{ color: 'var(--bad)' }}>Deployment failed</strong>
            <p className="note" style={{ margin: '8px 0 0', color: 'var(--bad)' }}>
              {state.message}
            </p>
            {state.log.length > 0 && (
              <pre className="cmd" style={{ marginTop: 12, maxHeight: 190, overflowY: 'auto' }}>
                {state.log.join('\n')}
              </pre>
            )}
            <p className="note">
              Transactions already confirmed are not undone. If the contract
              itself deployed, its address is in the log above.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {state.kind !== 'running' && state.kind !== 'done' && (
        <div className="row" style={{ marginTop: 18 }}>
          {wallet.state.kind === 'connected' ? (
            <button className="btn btn-primary" onClick={run}>
              {state.kind === 'failed' ? 'Try again' : `Deploy to ${TARGET_NETWORK}`}
            </button>
          ) : (
            <p className="note" style={{ margin: 0 }}>
              Connect a wallet in the header to deploy. It needs NIGHT that has
              been registered for DUST generation — the wallet's own UI does
              that, and it is what pays for these eight transactions.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
