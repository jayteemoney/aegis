import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type TrialCriteria = { conditionCode: bigint;
                              minAge: bigint;
                              maxAge: bigint
                            };

export type Witnesses<PS> = {
  patientDiagnosis(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  patientAge(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, bigint];
  patientOnExcludedMedication(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, boolean];
  patientRecordNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  patientSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  ping(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  attestPatientRecord(context: __compactRuntime.CircuitContext<PS>,
                      commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerTrial(context: __compactRuntime.CircuitContext<PS>,
                trialId_0: bigint,
                criteria_0: TrialCriteria): __compactRuntime.CircuitResults<PS, []>;
  checkTrialEligibility(context: __compactRuntime.CircuitContext<PS>,
                        trialId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  ping(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  attestPatientRecord(context: __compactRuntime.CircuitContext<PS>,
                      commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerTrial(context: __compactRuntime.CircuitContext<PS>,
                trialId_0: bigint,
                criteria_0: TrialCriteria): __compactRuntime.CircuitResults<PS, []>;
  checkTrialEligibility(context: __compactRuntime.CircuitContext<PS>,
                        trialId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  recordCommitment(diagnosis_0: bigint,
                   age_0: bigint,
                   onExcludedMedication_0: boolean,
                   nonce_0: Uint8Array): Uint8Array;
  trialNullifier(secretKey_0: Uint8Array, trialId_0: bigint): Uint8Array;
}

export type Circuits<PS> = {
  ping(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  recordCommitment(context: __compactRuntime.CircuitContext<PS>,
                   diagnosis_0: bigint,
                   age_0: bigint,
                   onExcludedMedication_0: boolean,
                   nonce_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  trialNullifier(context: __compactRuntime.CircuitContext<PS>,
                 secretKey_0: Uint8Array,
                 trialId_0: bigint): __compactRuntime.CircuitResults<PS, Uint8Array>;
  attestPatientRecord(context: __compactRuntime.CircuitContext<PS>,
                      commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  registerTrial(context: __compactRuntime.CircuitContext<PS>,
                trialId_0: bigint,
                criteria_0: TrialCriteria): __compactRuntime.CircuitResults<PS, []>;
  checkTrialEligibility(context: __compactRuntime.CircuitContext<PS>,
                        trialId_0: bigint): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly checksPerformed: bigint;
  trials: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: bigint): boolean;
    lookup(key_0: bigint): TrialCriteria;
    [Symbol.iterator](): Iterator<[bigint, TrialCriteria]>
  };
  attestedRecords: {
    isEmpty(): boolean;
    size(): bigint;
    member(elem_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<Uint8Array>
  };
  eligibilityResults: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
