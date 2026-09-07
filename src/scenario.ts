import { mkdirSync, writeFileSync } from 'node:fs';
import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import type { Logger } from 'pino';

import type { NetworkConfig } from './config.js';
import { DEMO_PATIENTS, DEMO_TRIALS, type DemoPatient, type DemoTrial } from './demo-data.js';
import type { AegisProviders } from './providers.js';
import { failureReason } from './simulator.js';
import { toHex } from './chain.js';
import { CompiledAegisContract, Contract, ledger, pureCircuits } from '../contracts/index.js';

/**
 * The Aegis scenario, as a sequence of real transactions.
 *
 * These steps live here rather than in a script because a wallet built through
 * the testkit rescans from genesis on every process, and on a long-lived chain
 * the DUST index makes that take more than a day. Running the whole scenario
 * inside one process is therefore not a convenience — it is the difference
 * between paying that cost once and paying it per command.
 */

/** The deployer holds no meaningful private state; it only writes public data. */
export const DEPLOYER_PRIVATE_STATE = {
  diagnosis: 0n,
  age: 0n,
  onExcludedMedication: false,
  recordNonce: new Uint8Array(32),
  secretKey: new Uint8Array(32).fill(0xde),
};

export const DEPLOYER_STATE_ID = 'aegis-deployer';

export type DeploymentRecord = {
  network: string;
  networkId: string;
  contractAddress: string;
  deployedAt: string;
  indexer: string;
  indexerWS: string;
  node: string;
  trials: Array<{ id: string; name: string }>;
};

/** Deploy the contract and publish the sponsor and issuer data. */
export async function deployAndSeed(
  logger: Logger,
  providers: AegisProviders,
  network: string,
  config: NetworkConfig,
): Promise<{ contractAddress: string; record: DeploymentRecord }> {
  const deployed = await deployContract<Contract>(providers, {
    compiledContract: CompiledAegisContract,
    privateStateId: DEPLOYER_STATE_ID,
    initialPrivateState: DEPLOYER_PRIVATE_STATE,
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  logger.info(`✅ Aegis deployed at: ${contractAddress}`);

  // Trials are public by design: a sponsor publishes what it requires.
  for (const trial of DEMO_TRIALS) {
    logger.info(`Registering trial ${trial.id}: ${trial.name}`);
    await submitCallTx<Contract, 'registerTrial'>(providers, {
      compiledContract: CompiledAegisContract,
      contractAddress,
      privateStateId: DEPLOYER_STATE_ID,
      circuitId: 'registerTrial',
      args: [trial.id, trial.criteria],
    });
  }

  // Attestations are blinded commitments — publishing them reveals no health data.
  for (const p of DEMO_PATIENTS) {
    const commitment = pureCircuits.recordCommitment(
      p.state.diagnosis,
      p.state.age,
      p.state.onExcludedMedication,
      p.state.recordNonce,
    );
    logger.info(`Attesting record for demo patient '${p.id}'`);
    await submitCallTx<Contract, 'attestPatientRecord'>(providers, {
      compiledContract: CompiledAegisContract,
      contractAddress,
      privateStateId: DEPLOYER_STATE_ID,
      circuitId: 'attestPatientRecord',
      args: [commitment],
    });
  }

  const record: DeploymentRecord = {
    network,
    networkId: config.networkId,
    contractAddress,
    deployedAt: new Date().toISOString(),
    indexer: config.indexer,
    indexerWS: config.indexerWS,
    node: config.node,
    trials: DEMO_TRIALS.map((t) => ({ id: String(t.id), name: t.name })),
  };

  return { contractAddress, record };
}

/**
 * Run eligibility checks as each patient.
 *
 * A refusal is the expected outcome for someone who does not qualify: the
 * circuit rejects them before a transaction is ever built, so the sponsor
 * never learns they tried.
 */
export async function proveEligibility(
  logger: Logger,
  providers: AegisProviders,
  contractAddress: string,
  patients: DemoPatient[] = DEMO_PATIENTS,
  trials: DemoTrial[] = DEMO_TRIALS,
): Promise<{ proven: number; refused: number }> {
  providers.privateStateProvider.setContractAddress(contractAddress);

  let proven = 0;
  let refused = 0;

  for (const patient of patients) {
    // The private state store is the patient's device. Nothing here is ever
    // serialised into a transaction.
    const privateStateId = `aegis-patient-${patient.id}`;
    await providers.privateStateProvider.set(privateStateId, patient.state);

    for (const trial of trials) {
      const nullifier = toHex(pureCircuits.trialNullifier(patient.state.secretKey, trial.id));
      logger.info(`${patient.label} → ${trial.name}`);

      try {
        await submitCallTx<Contract, 'checkTrialEligibility'>(providers, {
          compiledContract: CompiledAegisContract,
          contractAddress,
          privateStateId,
          circuitId: 'checkTrialEligibility',
          args: [trial.id],
        });
        proven += 1;
        logger.info(`  ✅ eligible — nullifier ${nullifier}`);
      } catch (err) {
        refused += 1;
        logger.info(`  ⛔ not eligible — ${failureReason(err)}`);
      }
    }
  }

  return { proven, refused };
}

/** Read back what the chain now holds, and say it out loud. */
export async function reportLedger(
  logger: Logger,
  providers: AegisProviders,
  contractAddress: string,
): Promise<void> {
  const state = await providers.publicDataProvider.queryContractState(contractAddress);
  if (!state) {
    logger.warn('Contract state not found — the indexer may not have caught up yet.');
    return;
  }
  const l = ledger(state.data);
  logger.info(
    `Public state — trials: ${l.trials.size()}, attestations: ${l.attestedRecords.size()}, ` +
      `results: ${l.eligibilityResults.size()}, checks: ${l.checksPerformed}`,
  );
}

/**
 * Write the deployment record.
 *
 * `deployment.json` is gitignored detail; `deployments/<network>.json` is the
 * public contract address the interface reads, and is committed.
 */
export function writeDeployment(record: DeploymentRecord): void {
  writeFileSync('deployment.json', JSON.stringify(record, null, 2));
  mkdirSync('deployments', { recursive: true });
  writeFileSync(`deployments/${record.network}.json`, JSON.stringify(record, null, 2));
}
