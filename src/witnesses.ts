import type { WitnessContext } from '@midnight-ntwrk/compact-runtime';
import type { Ledger } from '../contracts/managed/aegis/contract/index.js';
import type { AegisPrivateState } from './private-state.js';

/**
 * The witness layer: TypeScript callbacks the ZK prover calls to obtain the
 * patient's PRIVATE inputs.
 *
 * Each returns `[nextPrivateState, value]`. Aegis never mutates private state
 * here — an eligibility check is a pure read of facts the patient already
 * holds — so every witness returns the incoming state unchanged.
 *
 * These values are consumed inside the circuit only. They are never sent to
 * the node, the indexer, or the trial sponsor.
 */
export const aegisWitnesses = {
  patientDiagnosis: ({
    privateState,
  }: WitnessContext<Ledger, AegisPrivateState>): [AegisPrivateState, bigint] => [
    privateState,
    privateState.diagnosis,
  ],

  patientAge: ({
    privateState,
  }: WitnessContext<Ledger, AegisPrivateState>): [AegisPrivateState, bigint] => [
    privateState,
    privateState.age,
  ],

  patientOnExcludedMedication: ({
    privateState,
  }: WitnessContext<Ledger, AegisPrivateState>): [AegisPrivateState, boolean] => [
    privateState,
    privateState.onExcludedMedication,
  ],

  patientRecordNonce: ({
    privateState,
  }: WitnessContext<Ledger, AegisPrivateState>): [AegisPrivateState, Uint8Array] => [
    privateState,
    privateState.recordNonce,
  ],

  patientSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, AegisPrivateState>): [AegisPrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
};
