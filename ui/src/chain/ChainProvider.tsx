import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  diffPublicState,
  readPublicState,
  watchPublicState,
  type LedgerEvent,
  type PublicState,
} from '@aegis/chain';

import { ACTIVE_DEPLOYMENT } from '../deployment';

export type ChainStatus =
  | { kind: 'undeployed' }
  | { kind: 'connecting' }
  | { kind: 'live'; state: PublicState; lastUpdate: number }
  | { kind: 'error'; message: string };

export type ChainValue = {
  status: ChainStatus;
  /** Newest first. Derived by diffing consecutive ledger snapshots. */
  events: LedgerEvent[];
  /** Convenience: the live state, or null when we have none. */
  state: PublicState | null;
};

const ChainContext = createContext<ChainValue>({
  status: { kind: 'undeployed' },
  events: [],
  state: null,
});

/** How much history the feed keeps. The chain keeps all of it; this is a view. */
const MAX_EVENTS = 60;

/**
 * One subscription for the whole app.
 *
 * Every page wants chain state, and the nav bar wants it too. Subscribing per
 * component would open a websocket per mount and give each consumer its own
 * idea of what is "new", so the diff that drives the activity feed lives here,
 * above all of them.
 */
export function ChainProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ChainStatus>(
    ACTIVE_DEPLOYMENT ? { kind: 'connecting' } : { kind: 'undeployed' },
  );
  const [events, setEvents] = useState<LedgerEvent[]>([]);

  // The last snapshot we diffed against. A ref, not state, so absorbing a
  // snapshot cannot race with a re-render.
  const previous = useRef<PublicState | null>(null);

  useEffect(() => {
    const deployment = ACTIVE_DEPLOYMENT;
    if (!deployment) return;

    let cancelled = false;

    const absorb = (next: PublicState) => {
      if (cancelled) return;
      const fresh = diffPublicState(previous.current, next);
      previous.current = next;
      if (fresh.length > 0) {
        setEvents((current) => [...fresh, ...current].slice(0, MAX_EVENTS));
      }
      setStatus({ kind: 'live', state: next, lastUpdate: Date.now() });
    };

    // Seed with a one-shot read so the first paint has data before the
    // websocket finishes its handshake.
    readPublicState(deployment)
      .then((state) => {
        if (state) absorb(state);
      })
      .catch(() => {
        /* the subscription below is the real source of truth */
      });

    let subscription: { unsubscribe(): void } | undefined;
    try {
      subscription = watchPublicState(deployment).subscribe({
        next: absorb,
        error: (err: unknown) => {
          if (!cancelled) {
            setStatus({
              kind: 'error',
              message: err instanceof Error ? err.message : 'indexer unreachable',
            });
          }
        },
      });
    } catch (err) {
      setStatus({
        kind: 'error',
        message: err instanceof Error ? err.message : 'could not reach the indexer',
      });
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, []);

  const value = useMemo<ChainValue>(
    () => ({
      status,
      events,
      state: status.kind === 'live' ? status.state : null,
    }),
    [status, events],
  );

  return <ChainContext.Provider value={value}>{children}</ChainContext.Provider>;
}

export function useChain(): ChainValue {
  return useContext(ChainContext);
}
