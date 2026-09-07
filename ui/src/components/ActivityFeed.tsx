import { AnimatePresence, motion } from 'motion/react';
import type { LedgerEvent } from '@aegis/chain';
import { conditionLabel, DEMO_TRIALS } from '@aegis/demo-data';

const short = (hex: string) => `${hex.slice(0, 10)}…${hex.slice(-8)}`;

const trialName = (id: bigint) =>
  DEMO_TRIALS.find((t) => t.id === id)?.name ?? `Trial #${id}`;

type Line = { tone: 'public' | 'private'; circuit: string; title: string; detail: string };

function describe(e: LedgerEvent): Line {
  switch (e.kind) {
    case 'trial-registered':
      return {
        tone: 'public',
        circuit: 'registerTrial',
        title: `Trial registered — ${trialName(e.trialId)}`,
        detail: `${conditionLabel(e.criteria.conditionCode)} · ages ${e.criteria.minAge}–${e.criteria.maxAge}`,
      };
    case 'record-attested':
      return {
        tone: 'private',
        circuit: 'attestPatientRecord',
        title: 'Record attested by an issuer',
        detail: `commitment ${short(e.commitment)} — blinded, reveals nothing`,
      };
    case 'eligibility-proven':
      return {
        tone: 'private',
        circuit: 'checkTrialEligibility',
        title: e.eligible ? 'Eligibility proven' : 'Eligibility recorded as false',
        detail: `nullifier ${short(e.nullifier)} — no patient, no diagnosis, no age`,
      };
  }
}

const clock = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

/**
 * What the contract has done, as reconstructed from public state.
 *
 * Each row corresponds to a circuit call that must have happened. Rows that
 * were already on chain when the page opened are marked as history; anything
 * else arrived while you were watching.
 */
export function ActivityFeed({
  events,
  limit = 12,
  empty = 'Nothing has happened on chain yet.',
}: {
  events: LedgerEvent[];
  limit?: number;
  empty?: string;
}) {
  const shown = events.slice(0, limit);

  if (shown.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', color: 'var(--faint)' }}>
        {empty}
      </div>
    );
  }

  return (
    <ul className="activity">
      <AnimatePresence initial={false}>
        {shown.map((e) => {
          const line = describe(e);
          return (
            <motion.li
              key={e.key}
              layout
              className={e.backfill ? 'history' : 'fresh'}
              initial={{ opacity: 0, y: -14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className={`tag ${line.tone}`}>{line.circuit}</span>
              <div className="activity-body">
                <strong>{line.title}</strong>
                <span className="mono">{line.detail}</span>
              </div>
              <time>{e.backfill ? 'on chain' : clock(e.at)}</time>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
