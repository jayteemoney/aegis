/**
 * Prove a demo patient's eligibility for a trial, on chain, for real.
 *
 *   npx vite-node scripts/patient.ts ada 1
 *   npx vite-node scripts/patient.ts                  # every patient x every trial
 *
 * This is the patient half of Aegis. It generates a genuine zero-knowledge
 * proof against the deployed contract and submits it, so `checksPerformed` and
 * `eligibilityResults` move on the public ledger — which is what the interface
 * is watching. Open the UI alongside it and the nullifier lands in the feed.
 *
 * The patient's diagnosis, age and medication flag are supplied as witnesses
 * and never appear in the transaction. That is not a claim about this script:
 * the compiler refuses to build a circuit that leaks them without disclose().
 *
 * On a public testnet this runs from the browser instead, on the eligibility
 * page, with the wallet doing the proving and signing.
 */
import { existsSync, readFileSync } from 'node:fs';
import { WebSocket } from 'ws';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';

import { createLogger } from '../src/logger.js';
import { getConfig, LOCAL_GENESIS_SEED } from '../src/config.js';
import { MidnightWalletProvider, syncWallet } from '../src/wallet.js';
import { buildProviders } from '../src/providers.js';
import { DEMO_PATIENTS, DEMO_TRIALS } from '../src/demo-data.js';
import { proveEligibility, reportLedger } from '../src/scenario.js';
import { zkConfigPath } from '../contracts/index.js';

// @ts-expect-error WebSocket global assignment for apollo
globalThis.WebSocket = WebSocket;

const logger = createLogger('patient');

// Local only — see the note in deploy.ts.
const network = 'local';
const patientArg = process.argv[2];
const trialArg = process.argv[3];
process.env['MIDNIGHT_NETWORK'] = network;

const deploymentFile = `deployments/${network}.json`;
if (!existsSync(deploymentFile)) {
  throw new Error(
    `${deploymentFile} not found. Deploy first: yarn deploy:local`,
  );
}
const { contractAddress } = JSON.parse(readFileSync(deploymentFile, 'utf8')) as {
  contractAddress: string;
};

const patients = patientArg
  ? DEMO_PATIENTS.filter((p) => p.id === patientArg)
  : DEMO_PATIENTS;
if (patients.length === 0) {
  throw new Error(
    `Unknown patient '${patientArg}'. Known: ${DEMO_PATIENTS.map((p) => p.id).join(', ')}`,
  );
}
const trials = trialArg ? DEMO_TRIALS.filter((t) => t.id === BigInt(trialArg)) : DEMO_TRIALS;
if (trials.length === 0) {
  throw new Error(`Unknown trial '${trialArg}'. Known: ${DEMO_TRIALS.map((t) => t.id).join(', ')}`);
}

const config = getConfig();
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

logger.info(`Proving against ${contractAddress} on '${network}'`);

const wallet = await MidnightWalletProvider.build(logger, envConfig, { kind: 'seed', value: LOCAL_GENESIS_SEED });
await wallet.start();
await syncWallet(logger, wallet.wallet, Number(process.env['SYNC_TIMEOUT_MS'] ?? 4 * 60 * 60_000));

const providers = buildProviders(wallet, zkConfigPath, config);

const { proven, refused } = await proveEligibility(
  logger,
  providers,
  contractAddress,
  patients,
  trials,
);
logger.info(`Done — ${proven} proven, ${refused} refused.`);
await reportLedger(logger, providers, contractAddress);

await wallet.stop();
process.exit(0);
