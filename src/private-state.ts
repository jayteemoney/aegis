/**
 * Aegis private state.
 *
 * This is the patient's local, off-chain record. It is held by the
 * private-state provider on the patient's own machine and is the ONLY place
 * the raw health facts ever exist. Nothing here is transmitted: the witness
 * layer feeds these values into the ZK circuit, and only the circuit's
 * disclosed outputs (an eligibility nullifier) reach the ledger.
 */
export type AegisPrivateState = {
  /** Coded condition identifier, e.g. an ICD-style code mapped to a number. */
  readonly diagnosis: bigint;
  /** Age in years. */
  readonly age: bigint;
  /** True if the patient takes a medication that excludes them from trials. */
  readonly onExcludedMedication: boolean;
  /** Blinding factor binding these facts to the issuer's attestation. */
  readonly recordNonce: Uint8Array;
  /** Long-lived patient secret; derives per-trial nullifiers. */
  readonly secretKey: Uint8Array;
};

export const createAegisPrivateState = (
  diagnosis: bigint,
  age: bigint,
  onExcludedMedication: boolean,
  recordNonce: Uint8Array,
  secretKey: Uint8Array,
): AegisPrivateState => ({
  diagnosis,
  age,
  onExcludedMedication,
  recordNonce,
  secretKey,
});
