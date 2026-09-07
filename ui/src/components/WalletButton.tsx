import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { useWallet } from '../chain/WalletContext';

const shortAddress = (a: string) => `${a.slice(0, 12)}…${a.slice(-6)}`;

/**
 * Wallet connection, in the nav.
 *
 * A wallet is only needed to *submit* a proof. Reading the ledger, running the
 * circuit and seeing the result all work without one, so this never blocks the
 * page — it is an affordance, not a gate.
 */
export function WalletButton() {
  const { state, wallets, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);

  if (state.kind === 'unavailable') {
    return (
      <a
        className="chip"
        href="https://docs.midnight.network/develop/tutorial/using/chrome-ext"
        target="_blank"
        rel="noreferrer noopener"
        title="A Midnight-compatible wallet extension is needed to submit proofs"
      >
        <span className="dot" />
        no wallet
      </a>
    );
  }

  if (state.kind === 'connected') {
    return (
      <button className="chip ok" onClick={disconnect} title={state.address}>
        <span className="dot live" />
        {shortAddress(state.address)}
      </button>
    );
  }

  if (state.kind === 'connecting') {
    return (
      <span className="chip">
        <span className="dot warn" />
        connecting {state.walletName}…
      </span>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`chip ${state.kind === 'error' ? 'bad' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`dot ${state.kind === 'error' ? 'bad' : 'warn'}`} />
        {state.kind === 'error' ? 'connection failed' : 'connect wallet'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="wallet-menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            {wallets.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  setOpen(false);
                  void connect(w.id);
                }}
              >
                {/* The icon and name come from an extension we do not control,
                    so render them as an image and a text node — never markup. */}
                {w.icon ? <img src={w.icon} alt="" width={18} height={18} /> : <span>◈</span>}
                <span>{w.name}</span>
                <span className="mono">{w.apiVersion}</span>
              </button>
            ))}
            {state.kind === 'error' && <p className="note">{state.message}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
