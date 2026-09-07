import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { WebSocket } from 'ws';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {
  deployContract,
  submitCallTx,
  type DeployedContract,
} from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/midnight-js-protocol/compact-runtime';
import { type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import pino from 'pino';

import { getConfig, LOCAL_GENESIS_SEED } from '../config.js';
import { MidnightWalletProvider, syncWallet } from '../wallet.js';
import { buildProviders, type AegisProviders } from '../providers.js';
import { type AegisPrivateState } from '../private-state.js';
import {
  CompiledAegisContract,
  Contract,
  ledger,
  pureCircuits,
  zkConfigPath,
  type TrialCriteria,
} from '../../contracts/index.js';

// Required for GraphQL subscriptions in Node.js
// @ts-expect-error WebSocket global assignment for apollo
globalThis.WebSocket = WebSocket;

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: { target: 'pino-pretty' },
});

const network = process.env['MIDNIGHT_NETWORK'] ?? 'local';

/** Deterministic 32-byte value so test runs are reproducible. */
const bytes32 = (fill: number): Uint8Array => new Uint8Array(32).fill(fill);

/** Flatten an error and its `cause` chain into one searchable string. */
function errorChainText(err: unknown): string {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; current instanceof Error && depth < 10; depth += 1) {
    parts.push(current.message);
    current = (current as { cause?: unknown }).cause;
  }
  return parts.join(' | ');
}

/**
 * Assert a call fails, and fails for the *expected* reason.
 *
 * A bare `rejects.toThrow()` would also pass on a wiring or provider error,
 * which would silently turn a broken test into a green one. The circuit's own
 * assertion message has to appear in the error chain.
 */
async function expectRejectionBecause(
  run: () => Promise<unknown>,
  expectedReason: RegExp,
): Promise<void> {
  let thrown: unknown;
  try {
    await run();
  } catch (err) {
    thrown = err;
  }
  expect(thrown, 'expected the circuit to reject this patient').toBeDefined();
  expect(errorChainText(thrown)).toMatch(expectedReason);
}

// ── The trial ──────────────────────────────────────────────────────────
// PUBLIC data. A sponsor publishes exactly this and nothing more.
const TRIAL_ID = 1n;
const TRIAL_CRITERIA: TrialCriteria = {
  conditionCode: 100n, // e.g. "Type 2 Diabetes"
  minAge: 18n,
  maxAge: 65n,
};

// ── The patients ───────────────────────────────────────────────────────
// PRIVATE data. None of this ever leaves the local private-state store.
type Patient = {
  id: string;
  state: AegisPrivateState;
  /** Why this patient should or should not qualify. */
  note: string;
};

const alice: Patient = {
  id: 'aegis-patient-alice',
  note: 'matches condition, in age band, no excluded medication',
  state: {
    diagnosis: 100n,
    age: 42n,
    onExcludedMedication: false,
    recordNonce: bytes32(0xa1),
    secretKey: bytes32(0xa2),
  },
};

const bob: Patient = {
  id: 'aegis-patient-bob',
  note: 'right condition but 71 years old — outside the age band',
  state: {
    diagnosis: 100n,
    age: 71n,
    onExcludedMedication: false,
    recordNonce: bytes32(0xb1),
    secretKey: bytes32(0xb2),
  },
};

const carol: Patient = {
  id: 'aegis-patient-carol',
  note: 'right condition and age, but takes an excluded medication',
  state: {
    diagnosis: 100n,
    age: 40n,
    onExcludedMedication: true,
    recordNonce: bytes32(0xc1),
    secretKey: bytes32(0xc2),
  },
};

const dave: Patient = {
  id: 'aegis-patient-dave',
  note: 'in age band and unmedicated, but a different diagnosis',
  state: {
    diagnosis: 999n,
    age: 30n,
    onExcludedMedication: false,
    recordNonce: bytes32(0xd1),
    secretKey: bytes32(0xd2),
  },
};

const ALL_PATIENTS = [alice, bob, carol, dave];

/** The commitment an issuer would attest for a patient's record. */
const commitmentFor = (p: Patient): Uint8Array =>
  pureCircuits.recordCommitment(
    p.state.diagnosis,
    p.state.age,
    p.state.onExcludedMedication,
    p.state.recordNonce,
  );

const nullifierFor = (p: Patient): Uint8Array =>
  pureCircuits.trialNullifier(p.state.secretKey, TRIAL_ID);


describe(`Aegis — clinical trial eligibility (${network})`, () => {
  let wallet: MidnightWalletProvider;
  let providers: AegisProviders;
  let contractAddress: ContractAddress;

  const config = getConfig();
  const isRemote = network !== 'local';
  const syncTimeoutMs = Number(
    process.env['MIDNIGHT_SYNC_TIMEOUT_MS'] ?? (isRemote ? 60 * 60_000 : 10 * 60_000),
  );

  async function queryLedger() {
    const state = await providers.publicDataProvider.queryContractState(contractAddress);
    expect(state).not.toBeNull();
    return ledger(state!.data);
  }

  /** Run checkTrialEligibility as a given patient. */
  async function proveEligibility(p: Patient) {
    await providers.privateStateProvider.set(p.id, p.state);
    return submitCallTx<Contract, 'checkTrialEligibility'>(providers, {
      compiledContract: CompiledAegisContract,
      contractAddress,
      privateStateId: p.id,
      circuitId: 'checkTrialEligibility',
      args: [TRIAL_ID],
    });
  }

  beforeAll(async () => {
    setNetworkId(config.networkId);

    const envConfig: EnvironmentConfiguration = {
      walletNetworkId: config.networkId,
      networkId: config.networkId,
      indexer: config.indexer,
      indexerWS: config.indexerWS,
      node: config.node,
      nodeWS: config.nodeWS,
      faucet: config.faucet,
      proofServer: config.proofServer,
    };

    wallet = await MidnightWalletProvider.build(logger, envConfig, {
      kind: 'seed',
      value: LOCAL_GENESIS_SEED,
    });
    await wallet.start();
    await syncWallet(logger, wallet.wallet, syncTimeoutMs);

    providers = buildProviders(wallet, zkConfigPath, config);
    logger.info(`Providers initialized on '${network}'.`);

    const deployed: DeployedContract<Contract> = await deployContract<Contract>(providers, {
      compiledContract: CompiledAegisContract,
      privateStateId: alice.id,
      initialPrivateState: alice.state,
    });
    contractAddress = deployed.deployTxData.public.contractAddress;
    logger.info(`Aegis deployed at: ${contractAddress}`);
  });

  afterAll(async () => {
    if (wallet) await wallet.stop();
  });

  it('deploys with empty public state', async () => {
    expect(contractAddress).toBeDefined();
    const state = await queryLedger();
    expect(state.checksPerformed).toEqual(0n);
    expect(state.trials.isEmpty()).toBe(true);
    expect(state.eligibilityResults.isEmpty()).toBe(true);
  });

  it("publishes the sponsor's trial criteria publicly", async () => {
    await submitCallTx<Contract, 'registerTrial'>(providers, {
      compiledContract: CompiledAegisContract,
      contractAddress,
      privateStateId: alice.id,
      circuitId: 'registerTrial',
      args: [TRIAL_ID, TRIAL_CRITERIA],
    });

    const state = await queryLedger();
    expect(state.trials.member(TRIAL_ID)).toBe(true);
    expect(state.trials.lookup(TRIAL_ID)).toEqual(TRIAL_CRITERIA);
  });

  it('records issuer attestations as blinded commitments only', async () => {
    for (const p of ALL_PATIENTS) {
      await submitCallTx<Contract, 'attestPatientRecord'>(providers, {
        compiledContract: CompiledAegisContract,
        contractAddress,
        privateStateId: alice.id,
        circuitId: 'attestPatientRecord',
        args: [commitmentFor(p)],
      });
    }

    const state = await queryLedger();
    expect(state.attestedRecords.size()).toEqual(BigInt(ALL_PATIENTS.length));
    for (const p of ALL_PATIENTS) {
      expect(state.attestedRecords.member(commitmentFor(p))).toBe(true);
    }
  });

  it('lets an ELIGIBLE patient prove eligibility, disclosing only a nullifier', async () => {
    await proveEligibility(alice);

    const state = await queryLedger();
    const nullifier = nullifierFor(alice);

    // The single disclosed fact.
    expect(state.eligibilityResults.member(nullifier)).toBe(true);
    expect(state.eligibilityResults.lookup(nullifier)).toBe(true);
    expect(state.checksPerformed).toEqual(1n);

    // Nothing about Alice's actual health facts is recoverable from the ledger.
    const publicKeys = [...state.eligibilityResults].map(([k]) => k);
    expect(publicKeys).toHaveLength(1);
    expect(publicKeys[0]).toEqual(nullifier);
  });

  it.each([
    ['out-of-band age', bob, /above the trial's maximum age/],
    ['excluded medication', carol, /medication that excludes them/],
    ['non-matching diagnosis', dave, /does not match trial condition/],
  ])('rejects an INELIGIBLE patient (%s)', async (_label, patient, reason) => {
    await expectRejectionBecause(
      () => proveEligibility(patient as Patient),
      reason as RegExp,
    );

    // A failed check writes nothing: still just Alice's single result.
    const state = await queryLedger();
    expect(state.eligibilityResults.size()).toEqual(1n);
    expect(state.checksPerformed).toEqual(1n);
  });

  it('rejects a replayed proof from the same patient (nullifier reuse)', async () => {
    await expectRejectionBecause(
      () => proveEligibility(alice),
      /already proven for this trial/,
    );

    const state = await queryLedger();
    expect(state.eligibilityResults.size()).toEqual(1n);
    expect(state.checksPerformed).toEqual(1n);
  });
});
