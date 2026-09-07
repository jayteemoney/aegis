import {
  type CircuitContext,
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from '@midnight-ntwrk/compact-runtime';
import {
  Contract,
  ledger,
  pureCircuits,
  type Ledger,
  type TrialCriteria,
} from '../contracts/managed/aegis/contract/index.js';
import { aegisWitnesses } from './witnesses.js';
import { type AegisPrivateState } from './private-state.js';

export type { TrialCriteria, AegisPrivateState };

/**
 * A local Aegis deployment.
 *
 * Everything here runs the ACTUAL circuit compiled from `aegis.compact` — the
 * same JavaScript the on-chain runtime executes, including its `assert`s. The
 * UI deliberately does not re-implement the eligibility rules in TypeScript;
 * if it did, the screen could disagree with the contract.
 *
 * Wave 1 runs this against locally-held state. Wave 2 swaps the context for a
 * Lace-signed transaction against the deployed contract; the circuit, the
 * witnesses and the disclosure boundary do not change.
 */
export class AegisRuntime {
  private contract: Contract<AegisPrivateState>;
  private context: CircuitContext<AegisPrivateState>;

  private constructor(
    contract: Contract<AegisPrivateState>,
    context: CircuitContext<AegisPrivateState>,
  ) {
    this.contract = contract;
    this.context = context;
  }

  static create(initialPrivateState: AegisPrivateState): AegisRuntime {
    const contract = new Contract<AegisPrivateState>(aegisWitnesses);
    const address = sampleContractAddress();
    const { currentContractState, currentPrivateState, currentZswapLocalState } =
      contract.initialState(createConstructorContext(initialPrivateState, '0'.repeat(64)));

    const context = createCircuitContext<AegisPrivateState>(
      address,
      currentZswapLocalState,
      currentContractState,
      currentPrivateState,
    );

    return new AegisRuntime(contract, context);
  }

  /** Read the public ledger exactly as an on-chain observer would see it. */
  get publicLedger(): Ledger {
    return ledger(this.context.currentQueryContext.state);
  }

  /** Replace the private facts held locally, without touching public state. */
  setPrivateState(privateState: AegisPrivateState): void {
    this.context = { ...this.context, currentPrivateState: privateState };
  }

  /** Sponsor-side: publish a trial's criteria. */
  registerTrial(trialId: bigint, criteria: TrialCriteria): void {
    const { context } = this.contract.impureCircuits.registerTrial(
      this.context,
      trialId,
      criteria,
    );
    this.context = context;
  }

  /** Issuer-side: attest a blinded record commitment. */
  attestPatientRecord(commitment: Uint8Array): void {
    const { context } = this.contract.impureCircuits.attestPatientRecord(
      this.context,
      commitment,
    );
    this.context = context;
  }

  /**
   * Run the eligibility circuit. Throws when the patient does not qualify —
   * the assertion failure is the contract's own, not a UI check.
   */
  checkTrialEligibility(trialId: bigint): void {
    const { context } = this.contract.impureCircuits.checkTrialEligibility(
      this.context,
      trialId,
    );
    this.context = context;
  }

  /** The blinded commitment an issuer would attest for these facts. */
  static recordCommitment(ps: AegisPrivateState): Uint8Array {
    return pureCircuits.recordCommitment(
      ps.diagnosis,
      ps.age,
      ps.onExcludedMedication,
      ps.recordNonce,
    );
  }

  /** The nullifier this patient would disclose for a given trial. */
  static trialNullifier(ps: AegisPrivateState, trialId: bigint): Uint8Array {
    return pureCircuits.trialNullifier(ps.secretKey, trialId);
  }
}

export const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/** Deterministic 32-byte value derived from a label, for demo patients. */
export const bytes32 = (fill: number): Uint8Array => new Uint8Array(32).fill(fill);

/**
 * Pull the human-readable reason out of a circuit failure. The runtime wraps
 * the Compact `assert` message in a chain of causes.
 */
export function failureReason(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; current instanceof Error && depth < 10; depth += 1) {
    parts.push(current.message);
    current = (current as { cause?: unknown }).cause;
  }
  const text = parts.join(' | ');

  const known = [
    'no issuer attestation for these facts',
    'diagnosis does not match trial condition',
    "patient is below the trial's minimum age",
    "patient is above the trial's maximum age",
    'patient takes a medication that excludes them from this trial',
    'eligibility already proven for this trial',
  ];
  return known.find((k) => text.includes(k)) ?? text.split(' | ')[0] ?? 'unknown error';
}
