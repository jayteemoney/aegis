import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { deployContract, submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createProofProvider } from '@midnight-ntwrk/midnight-js-types';

import type { AegisPrivateState } from '@aegis/private-state';
import type { Contract } from '@aegis/contract';
import { pureCircuits } from '@aegis/contract';
import { DEMO_PATIENTS, DEMO_TRIALS } from '@aegis/demo-data';
import { NETWORKS } from '@aegis/config';
import type { DeploymentInfo } from '@aegis/chain';

import { CompiledAegisContract } from './contract';
import { ConnectorWalletProvider } from './lace';
import { FetchZkConfigProvider, type AegisCircuitId } from './zk-config';
import { createSessionPrivateStateProvider } from './session-private-state';

/**
 * Deploying Aegis from the browser.
 *
 * The Node deploy script cannot reach a long-lived testnet in practice: a
 * headless wallet has no persisted dust state, so it rescans from genesis on
 * every run — over a day of wall clock on preprod. A browser wallet keeps its
 * own state synced continuously and never cold-starts, which makes it the only
 * workable route, and incidentally the same one a real operator would use.
 *
 * The wallet does the proving, balancing, signing and submission. It is never
 * handed a patient's facts: everything deployed here is public trial criteria
 * or an already-blinded commitment.
 */

export const DEPLOYER_STATE_ID = 'aegis-deployer';

/** The deployer holds no meaningful private state; it only writes public data. */
const DEPLOYER_PRIVATE_STATE: AegisPrivateState = {
  diagnosis: 0n,
  age: 0n,
  onExcludedMedication: false,
  recordNonce: new Uint8Array(32),
  secretKey: new Uint8Array(32).fill(0xde),
};

export type DeployProgress = (step: string, detail?: string) => void;

export type BrowserDeployResult = {
  record: DeploymentInfo & { trials: Array<{ id: string; name: string }> };
  /** Ready to save as `deployments/<network>.json`. */
  json: string;
};

function buildProviders(network: string) {
  const config = NETWORKS[network];
  if (!config) throw new Error(`Unknown network '${network}'.`);
  setNetworkId(config.networkId);

  const privateStateProvider = createSessionPrivateStateProvider<AegisPrivateState>();
  const zkConfigProvider = new FetchZkConfigProvider<AegisCircuitId>('/zk');

  return { config, privateStateProvider, zkConfigProvider };
}

/**
 * Deploy the contract and publish the sponsor and issuer data.
 *
 * Each step is a separate transaction the wallet will ask you to approve.
 */
export async function deployAegisFromBrowser({
  api,
  network,
  onProgress,
}: {
  api: ConnectedAPI;
  network: string;
  onProgress?: DeployProgress;
}): Promise<BrowserDeployResult> {
  const report = onProgress ?? (() => {});
  const { config, privateStateProvider, zkConfigProvider } = buildProviders(network);

  report('Preparing proving material…');
  const provingProvider = await api.getProvingProvider(zkConfigProvider.asKeyMaterialProvider());
  const proofProvider = createProofProvider(provingProvider);
  const walletProvider = await ConnectorWalletProvider.create(api, config.networkId);

  const providers = {
    privateStateProvider,
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider: walletProvider,
  };

  report('Deploying the contract…', 'Approve the transaction in your wallet.');
  const deployed = await deployContract<Contract<AegisPrivateState>>(providers as never, {
    compiledContract: CompiledAegisContract,
    privateStateId: DEPLOYER_STATE_ID,
    initialPrivateState: DEPLOYER_PRIVATE_STATE,
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  report('Contract deployed.', contractAddress);

  // Trials are public by design: a sponsor publishes what it requires.
  for (const trial of DEMO_TRIALS) {
    report(`Registering trial ${trial.id}…`, trial.name);
    await submitCallTx<Contract<AegisPrivateState>, 'registerTrial'>(providers as never, {
      compiledContract: CompiledAegisContract,
      contractAddress,
      privateStateId: DEPLOYER_STATE_ID,
      circuitId: 'registerTrial',
      args: [trial.id, trial.criteria],
    });
  }

  // Attestations are blinded commitments — publishing them reveals no health data.
  for (const p of DEMO_PATIENTS) {
    report(`Attesting record for '${p.id}'…`, 'A blinded commitment, not the record.');
    const commitment = pureCircuits.recordCommitment(
      p.state.diagnosis,
      p.state.age,
      p.state.onExcludedMedication,
      p.state.recordNonce,
    );
    await submitCallTx<Contract<AegisPrivateState>, 'attestPatientRecord'>(providers as never, {
      compiledContract: CompiledAegisContract,
      contractAddress,
      privateStateId: DEPLOYER_STATE_ID,
      circuitId: 'attestPatientRecord',
      args: [commitment],
    });
  }

  const record = {
    network,
    networkId: config.networkId,
    contractAddress,
    deployedAt: new Date().toISOString(),
    indexer: config.indexer,
    indexerWS: config.indexerWS,
    node: config.node,
    trials: DEMO_TRIALS.map((t) => ({ id: String(t.id), name: t.name })),
  };

  report('Done.', 'Save the record below so the interface can find the contract.');
  return { record, json: JSON.stringify(record, null, 2) };
}
