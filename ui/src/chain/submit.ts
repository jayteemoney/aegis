import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { submitCallTx } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { createProofProvider } from '@midnight-ntwrk/midnight-js-types';

import type { AegisPrivateState } from '@aegis/private-state';
import type { DeploymentInfo } from '@aegis/chain';
import type { Contract } from '@aegis/contract';

import { CompiledAegisContract } from './contract';
import { ConnectorWalletProvider } from './lace';
import { FetchZkConfigProvider, type AegisCircuitId } from './zk-config';
import { createSessionPrivateStateProvider } from './session-private-state';

/**
 * Prove eligibility and submit it, entirely from the browser.
 *
 * The order matters, and it is the whole privacy argument in five steps:
 *
 *   1. The patient's facts are written to an in-memory private-state store.
 *   2. The circuit runs, reading them through witnesses.
 *   3. The wallet proves the circuit — it is handed the proving key and the
 *      preimage, and returns a proof.
 *   4. The wallet balances and seals the resulting transaction.
 *   5. The wallet submits it.
 *
 * By step 4 there is nothing private left in the object: the witnesses were
 * consumed inside the proof, and the only values that crossed `disclose()` are
 * the nullifier and the boolean. The wallet never sees a diagnosis.
 */
export type SubmitProgress = (phase: string) => void;

export async function submitEligibilityCheck({
  api,
  deployment,
  privateState,
  privateStateId,
  trialId,
  onProgress,
}: {
  api: ConnectedAPI;
  deployment: DeploymentInfo;
  privateState: AegisPrivateState;
  privateStateId: string;
  trialId: bigint;
  onProgress?: SubmitProgress;
}): Promise<string> {
  const report = onProgress ?? (() => {});

  setNetworkId(deployment.networkId);

  report('Preparing your private state…');
  const privateStateProvider = createSessionPrivateStateProvider<AegisPrivateState>();
  privateStateProvider.setContractAddress(deployment.contractAddress);
  await privateStateProvider.set(privateStateId, privateState);

  report('Loading the circuit’s proving key…');
  const zkConfigProvider = new FetchZkConfigProvider<AegisCircuitId>('/zk');

  report('Asking your wallet to prove the circuit…');
  // Proving is delegated to the wallet, which is why this needs no local proof
  // server. The wallet receives key material and a preimage — never a witness
  // value in a form it could read as a health fact.
  const provingProvider = await api.getProvingProvider(zkConfigProvider.asKeyMaterialProvider());
  const proofProvider = createProofProvider(provingProvider);

  const walletProvider = await ConnectorWalletProvider.create(api, deployment.networkId);

  const providers = {
    privateStateProvider,
    publicDataProvider: indexerPublicDataProvider(deployment.indexer, deployment.indexerWS),
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider: walletProvider,
  };

  report('Balancing and submitting the transaction…');
  const result = await submitCallTx<Contract<AegisPrivateState>, 'checkTrialEligibility'>(
    providers as never,
    {
      compiledContract: CompiledAegisContract,
      contractAddress: deployment.contractAddress,
      privateStateId,
      circuitId: 'checkTrialEligibility',
      args: [trialId],
    },
  );

  report('Waiting for the indexer to catch up…');
  return String(result.public.txId ?? result.public.txHash ?? 'submitted');
}
