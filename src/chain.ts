import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ledger, type Ledger, type TrialCriteria } from '../contracts/managed/aegis/contract/index.js';

/**
 * Read-only view of the deployed Aegis contract.
 *
 * Everything here is genuinely public chain data pulled from the Midnight
 * indexer — no wallet, no signing, no private state. That is the point: an
 * observer can watch the ledger and still learn nothing about any patient.
 */

export type DeploymentInfo = {
  network: string;
  networkId: string;
  contractAddress: string;
  deployedAt: string;
  indexer: string;
  indexerWS: string;
  node: string;
};

/** A trial as it actually exists on chain. */
export type OnChainTrial = {
  id: bigint;
  criteria: TrialCriteria;
};

/** The public ledger, decoded into plain values the UI can render. */
export type PublicState = {
  checksPerformed: bigint;
  trials: OnChainTrial[];
  /** Blinded record commitments published by issuers, as hex. */
  attestations: string[];
  attestedRecordCount: bigint;
  /** nullifier (hex) -> eligible. The only per-patient data that exists. */
  results: Array<{ nullifier: string; eligible: boolean }>;
  /** When this browser observed the snapshot. Not chain data. */
  observedAt: number;
};

export const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export function decodeLedger(state: Ledger): PublicState {
  const attestations = [...state.attestedRecords].map(toHex);
  return {
    checksPerformed: state.checksPerformed,
    // Map iteration order follows the trie, not the trial ids. Sort so the
    // registry renders the same way on every snapshot.
    trials: [...state.trials]
      .map(([id, criteria]) => ({ id, criteria }))
      .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)),
    attestations,
    attestedRecordCount: state.attestedRecords.size(),
    results: [...state.eligibilityResults].map(([nullifier, eligible]) => ({
      nullifier: toHex(nullifier),
      eligible,
    })),
    observedAt: Date.now(),
  };
}

/**
 * A change to public state, as the UI reports it.
 *
 * Compact has no event log: a circuit's only observable effect is the ledger
 * it leaves behind, and the indexer streams whole state snapshots. So the
 * "events" here are derived by diffing consecutive snapshots. That is not a
 * shortcut — it is the strongest claim available. An event log could in
 * principle say more than the state does; a diff cannot. Everything below is
 * therefore something an arbitrary observer could reconstruct for themselves.
 */
export type LedgerEvent = {
  /** Stable identity, so a re-render does not replay the feed. */
  key: string;
  /** Which circuit must have run to produce this change. */
  circuit: 'registerTrial' | 'attestPatientRecord' | 'checkTrialEligibility';
  at: number;
  /** True when the entry was already on chain the first time we looked. */
  backfill: boolean;
} & (
  | { kind: 'trial-registered'; trialId: bigint; criteria: TrialCriteria }
  | { kind: 'record-attested'; commitment: string }
  | { kind: 'eligibility-proven'; nullifier: string; eligible: boolean }
);

/**
 * Everything that changed between two snapshots, newest first.
 *
 * Ledger entries are only ever inserted by this contract — no circuit removes
 * one — so a set difference is a complete account of what happened.
 */
export function diffPublicState(
  prev: PublicState | null,
  next: PublicState,
): LedgerEvent[] {
  const backfill = prev === null;
  const at = next.observedAt;
  const events: LedgerEvent[] = [];

  const seenTrials = new Set((prev?.trials ?? []).map((t) => String(t.id)));
  for (const t of next.trials) {
    if (seenTrials.has(String(t.id))) continue;
    events.push({
      key: `trial:${t.id}`,
      circuit: 'registerTrial',
      kind: 'trial-registered',
      trialId: t.id,
      criteria: t.criteria,
      at,
      backfill,
    });
  }

  const seenAttestations = new Set(prev?.attestations ?? []);
  for (const commitment of next.attestations) {
    if (seenAttestations.has(commitment)) continue;
    events.push({
      key: `attestation:${commitment}`,
      circuit: 'attestPatientRecord',
      kind: 'record-attested',
      commitment,
      at,
      backfill,
    });
  }

  const seenResults = new Set((prev?.results ?? []).map((r) => r.nullifier));
  for (const r of next.results) {
    if (seenResults.has(r.nullifier)) continue;
    events.push({
      key: `eligibility:${r.nullifier}`,
      circuit: 'checkTrialEligibility',
      kind: 'eligibility-proven',
      nullifier: r.nullifier,
      eligible: r.eligible,
      at,
      backfill,
    });
  }

  return events.reverse();
}

export function createPublicDataProvider(deployment: DeploymentInfo) {
  setNetworkId(deployment.networkId);

  // The provider defaults its websocket implementation to `isomorphic-ws`,
  // whose browser build exports no `WebSocket` — so the default is `undefined`
  // and graphql-ws silently falls back to the global. That fallback works, but
  // relying on it is fragile (and the bundler warns about it), so pass the
  // browser's native WebSocket explicitly when we have one.
  const webSocketImpl =
    typeof globalThis !== 'undefined' && typeof globalThis.WebSocket !== 'undefined'
      ? globalThis.WebSocket
      : undefined;

  return indexerPublicDataProvider(
    deployment.indexer,
    deployment.indexerWS,
    webSocketImpl as never,
  );
}

/** One-shot read of current public state. Returns null if not yet indexed. */
export async function readPublicState(
  deployment: DeploymentInfo,
): Promise<PublicState | null> {
  const provider = createPublicDataProvider(deployment);
  const state = await provider.queryContractState(deployment.contractAddress);
  if (!state) return null;
  return decodeLedger(ledger(state.data));
}

/**
 * Live stream of public state, emitting on every on-chain change.
 *
 * This is how the UI reflects other people's transactions: when anyone proves
 * eligibility, a new nullifier appears here within a block.
 */
export function watchPublicState(deployment: DeploymentInfo): Observable<PublicState> {
  const provider = createPublicDataProvider(deployment);
  return provider
    .contractStateObservable(deployment.contractAddress, { type: 'latest' })
    .pipe(map((state) => decodeLedger(ledger(state.data))));
}
