import { describe, it, expect } from 'vitest';

import { AegisRuntime, bytes32, toHex } from '../simulator.js';
import { decodeLedger, diffPublicState, type PublicState } from '../chain.js';
import { type AegisPrivateState } from '../private-state.js';
import { type TrialCriteria } from '../../contracts/index.js';

/**
 * The UI's read layer, tested against genuine contract state.
 *
 * `decodeLedger` is fed the same `Ledger` object the indexer hands the browser
 * — produced here by running the real circuit rather than by hand-building a
 * fixture, so a change to the contract's public shape breaks these tests
 * instead of silently breaking the interface.
 */

const CRITERIA: TrialCriteria = { conditionCode: 100n, minAge: 18n, maxAge: 65n };

const patient = (over: Partial<AegisPrivateState> = {}): AegisPrivateState => ({
  diagnosis: 100n,
  age: 42n,
  onExcludedMedication: false,
  recordNonce: bytes32(0xa1),
  secretKey: bytes32(0xa2),
  ...over,
});

describe('decodeLedger', () => {
  it('reports an untouched contract as empty', () => {
    const state = decodeLedger(AegisRuntime.create(patient()).publicLedger);
    expect(state.checksPerformed).toEqual(0n);
    expect(state.trials).toEqual([]);
    expect(state.attestations).toEqual([]);
    expect(state.results).toEqual([]);
  });

  it('surfaces trials, attestations and results as the UI renders them', () => {
    const ps = patient();
    const runtime = AegisRuntime.create(ps);
    runtime.registerTrial(1n, CRITERIA);
    runtime.attestPatientRecord(AegisRuntime.recordCommitment(ps));
    runtime.checkTrialEligibility(1n);

    const state = decodeLedger(runtime.publicLedger);

    expect(state.checksPerformed).toEqual(1n);
    expect(state.trials).toEqual([{ id: 1n, criteria: CRITERIA }]);
    expect(state.attestations).toEqual([toHex(AegisRuntime.recordCommitment(ps))]);
    expect(state.attestedRecordCount).toEqual(1n);
    expect(state.results).toEqual([
      { nullifier: toHex(AegisRuntime.trialNullifier(ps, 1n)), eligible: true },
    ]);
  });

  it('orders trials by id regardless of the ledger map order', () => {
    const runtime = AegisRuntime.create(patient());
    for (const id of [3n, 1n, 2n]) runtime.registerTrial(id, CRITERIA);
    expect(decodeLedger(runtime.publicLedger).trials.map((t) => t.id)).toEqual([1n, 2n, 3n]);
  });

  it('never exposes a health fact — the decoded state has nowhere to put one', () => {
    const ps = patient({ age: 61n, diagnosis: 100n });
    const runtime = AegisRuntime.create(ps);
    runtime.registerTrial(1n, CRITERIA);
    runtime.attestPatientRecord(AegisRuntime.recordCommitment(ps));
    runtime.checkTrialEligibility(1n);

    // A blunt instrument on purpose: serialise everything the UI can see and
    // check the patient's own values are not in it anywhere.
    const serialised = JSON.stringify(decodeLedger(runtime.publicLedger), (_k, v) =>
      typeof v === 'bigint' ? String(v) : v,
    );
    expect(serialised).not.toContain('"61"');
    expect(serialised).not.toContain(toHex(ps.recordNonce));
    expect(serialised).not.toContain(toHex(ps.secretKey));
  });
});

describe('diffPublicState', () => {
  const snapshot = (over: Partial<PublicState> = {}): PublicState => ({
    checksPerformed: 0n,
    trials: [],
    attestations: [],
    attestedRecordCount: 0n,
    results: [],
    observedAt: 1_000,
    ...over,
  });

  it('treats the first snapshot as backfill, newest entry first', () => {
    const events = diffPublicState(
      null,
      snapshot({
        trials: [{ id: 1n, criteria: CRITERIA }],
        attestations: ['aa'],
        attestedRecordCount: 1n,
        results: [{ nullifier: 'bb', eligible: true }],
      }),
    );

    expect(events.map((e) => e.circuit)).toEqual([
      'checkTrialEligibility',
      'attestPatientRecord',
      'registerTrial',
    ]);
    expect(events.every((e) => e.backfill)).toBe(true);
  });

  it('reports only what changed, and marks it live', () => {
    const before = snapshot({
      trials: [{ id: 1n, criteria: CRITERIA }],
      attestations: ['aa'],
      attestedRecordCount: 1n,
    });
    const after = snapshot({
      ...before,
      checksPerformed: 1n,
      results: [{ nullifier: 'bb', eligible: true }],
      observedAt: 2_000,
    });

    const events = diffPublicState(before, after);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      circuit: 'checkTrialEligibility',
      kind: 'eligibility-proven',
      nullifier: 'bb',
      backfill: false,
      at: 2_000,
    });
  });

  it('emits nothing when the snapshot is unchanged', () => {
    const state = snapshot({ trials: [{ id: 1n, criteria: CRITERIA }] });
    expect(diffPublicState(state, { ...state, observedAt: 2_000 })).toEqual([]);
  });

  it('gives each entry a stable key so a re-render does not replay the feed', () => {
    const a = diffPublicState(null, snapshot({ results: [{ nullifier: 'bb', eligible: true }] }));
    const b = diffPublicState(null, snapshot({ results: [{ nullifier: 'bb', eligible: true }] }));
    expect(a[0]!.key).toEqual(b[0]!.key);
  });
});
