import { describe, it, expect } from 'vitest';
import { AegisRuntime, bytes32, failureReason, toHex } from '../simulator.js';
import { type AegisPrivateState } from '../private-state.js';
import { type TrialCriteria } from '../../contracts/index.js';

/**
 * These tests cover the local execution path the browser UI uses: the real
 * compiled circuit, run in-process against locally held state. They need no
 * devnet, so they are the fast feedback loop; `aegis.test.ts` proves the same
 * contract behaves identically once deployed.
 */

const TRIAL_ID = 1n;
const CRITERIA: TrialCriteria = { conditionCode: 100n, minAge: 18n, maxAge: 65n };

const patient = (over: Partial<AegisPrivateState> = {}): AegisPrivateState => ({
  diagnosis: 100n,
  age: 42n,
  onExcludedMedication: false,
  recordNonce: bytes32(0xa1),
  secretKey: bytes32(0xa2),
  ...over,
});

/** Fresh contract with the trial published and this patient's record attested. */
function seeded(ps: AegisPrivateState): AegisRuntime {
  const runtime = AegisRuntime.create(ps);
  runtime.registerTrial(TRIAL_ID, CRITERIA);
  runtime.attestPatientRecord(AegisRuntime.recordCommitment(ps));
  return runtime;
}

describe('Aegis simulator (local circuit execution)', () => {
  it('starts with empty public state', () => {
    const runtime = AegisRuntime.create(patient());
    expect(runtime.publicLedger.checksPerformed).toEqual(0n);
    expect(runtime.publicLedger.trials.isEmpty()).toBe(true);
    expect(runtime.publicLedger.eligibilityResults.isEmpty()).toBe(true);
  });

  it('publishes trial criteria as public state', () => {
    const runtime = seeded(patient());
    expect(runtime.publicLedger.trials.lookup(TRIAL_ID)).toEqual(CRITERIA);
  });

  it('lets an eligible patient prove, disclosing only the nullifier', () => {
    const ps = patient();
    const runtime = seeded(ps);
    runtime.checkTrialEligibility(TRIAL_ID);

    const nullifier = AegisRuntime.trialNullifier(ps, TRIAL_ID);
    const ledger = runtime.publicLedger;
    expect(ledger.eligibilityResults.lookup(nullifier)).toBe(true);
    expect(ledger.checksPerformed).toEqual(1n);

    // The disclosed key is the nullifier and nothing else.
    const written = [...ledger.eligibilityResults].map(([k]) => toHex(k));
    expect(written).toEqual([toHex(nullifier)]);
  });

  it.each([
    ['age above the band', patient({ age: 71n }), /above the trial's maximum age/],
    ['age below the band', patient({ age: 12n }), /below the trial's minimum age/],
    ['excluded medication', patient({ onExcludedMedication: true }), /medication that excludes/],
    ['different diagnosis', patient({ diagnosis: 999n }), /does not match trial condition/],
  ])('rejects %s', (_label, ps, reason) => {
    const runtime = seeded(ps);
    let thrown: unknown;
    try {
      runtime.checkTrialEligibility(TRIAL_ID);
    } catch (err) {
      thrown = err;
    }
    expect(thrown, 'circuit should have rejected this patient').toBeDefined();
    expect(failureReason(thrown)).toMatch(reason);

    // Nothing was written.
    expect(runtime.publicLedger.eligibilityResults.isEmpty()).toBe(true);
    expect(runtime.publicLedger.checksPerformed).toEqual(0n);
  });

  it('rejects facts that no issuer attested', () => {
    const ps = patient();
    const runtime = AegisRuntime.create(ps);
    runtime.registerTrial(TRIAL_ID, CRITERIA);
    // deliberately no attestPatientRecord

    let thrown: unknown;
    try {
      runtime.checkTrialEligibility(TRIAL_ID);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeDefined();
    expect(failureReason(thrown)).toMatch(/no issuer attestation/);
  });

  it('rejects a replayed proof for the same trial', () => {
    const ps = patient();
    const runtime = seeded(ps);
    runtime.checkTrialEligibility(TRIAL_ID);

    let thrown: unknown;
    try {
      runtime.checkTrialEligibility(TRIAL_ID);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeDefined();
    expect(failureReason(thrown)).toMatch(/already proven for this trial/);
    expect(runtime.publicLedger.checksPerformed).toEqual(1n);
  });

  it('produces a commitment that hides the underlying facts', () => {
    const a = AegisRuntime.recordCommitment(patient());
    const b = AegisRuntime.recordCommitment(patient({ age: 43n }));
    expect(toHex(a)).not.toEqual(toHex(b));
    expect(a).toHaveLength(32);
  });

  it('derives different nullifiers per trial for the same patient', () => {
    const ps = patient();
    expect(toHex(AegisRuntime.trialNullifier(ps, 1n))).not.toEqual(
      toHex(AegisRuntime.trialNullifier(ps, 2n)),
    );
  });
});
