import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

import { connectWallet, detectWallets, type DetectedWallet } from './lace';
import { prefetchProvingKey } from './zk-config';
import { ACTIVE_DEPLOYMENT, TARGET_NETWORK } from '../deployment';

export type WalletState =
  | { kind: 'unavailable' }
  | { kind: 'disconnected' }
  | { kind: 'connecting'; walletName: string }
  | { kind: 'connected'; api: ConnectedAPI; walletName: string; address: string; networkId: string }
  | { kind: 'error'; message: string };

export type WalletValue = {
  state: WalletState;
  wallets: DetectedWallet[];
  connect: (id: string) => Promise<void>;
  disconnect: () => void;
};

const WalletCtx = createContext<WalletValue>({
  state: { kind: 'unavailable' },
  wallets: [],
  connect: async () => {},
  disconnect: () => {},
});

/**
 * Browser wallet connection.
 *
 * Extensions inject themselves asynchronously, so a single check at mount
 * misses a wallet that is a few milliseconds late. Poll briefly, then stop —
 * a wallet that has not appeared within a couple of seconds is not installed,
 * and polling forever would keep the page busy for every visitor who does not
 * have one.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<DetectedWallet[]>(() => detectWallets());
  const [state, setState] = useState<WalletState>(() =>
    detectWallets().length > 0 ? { kind: 'disconnected' } : { kind: 'unavailable' },
  );

  useEffect(() => {
    if (wallets.length > 0) return;

    let attempts = 0;
    const timer = setInterval(() => {
      const found = detectWallets();
      attempts += 1;
      if (found.length > 0) {
        setWallets(found);
        setState((current) => (current.kind === 'unavailable' ? { kind: 'disconnected' } : current));
        clearInterval(timer);
      } else if (attempts >= 10) {
        clearInterval(timer);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [wallets.length]);

  const connect = useCallback(async (id: string) => {
    const wallet = detectWallets().find((w) => w.id === id);
    const walletName = wallet?.name ?? id;
    // Prefer the network this session is aimed at: a first deploy has no
    // record to read one from, and connecting as 'undeployed' would point the
    // wallet at the wrong chain entirely.
    const networkId = ACTIVE_DEPLOYMENT?.networkId ?? TARGET_NETWORK;

    setState({ kind: 'connecting', walletName });
    try {
      const api = await connectWallet(id, networkId);
      const { unshieldedAddress } = await api.getUnshieldedAddress();
      setState({ kind: 'connected', api, walletName, address: unshieldedAddress, networkId });

      // Connecting signals intent to submit, so start pulling the proving key
      // now rather than making the first submission wait for it.
      prefetchProvingKey();
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not connect to the wallet',
      });
    }
  }, []);

  // There is no "disconnect" in the connector API — the wallet owns that
  // decision — so this only forgets the connection on our side.
  const disconnect = useCallback(() => {
    setState(detectWallets().length > 0 ? { kind: 'disconnected' } : { kind: 'unavailable' });
  }, []);

  const value = useMemo<WalletValue>(
    () => ({ state, wallets, connect, disconnect }),
    [state, wallets, connect, disconnect],
  );

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>;
}

export function useWallet(): WalletValue {
  return useContext(WalletCtx);
}
