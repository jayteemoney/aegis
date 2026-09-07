/**
 * Deploy Aegis to a Midnight network and seed its public state.
 *
 *   npx vite-node scripts/deploy.ts
 *
 * Writes two files:
 *   deployment.json             full detail, gitignored
 *   deployments/<network>.json  the public contract address, committed so the
 *                               UI can find the contract without a rebuild
 *
 * Requires a proof server (`yarn proof:up`). The dev chain preset funds the
 * genesis account, so nothing else is needed — no faucet, no DUST delegation.
 *
 * Deploying to a public testnet is done from the browser instead; see the
 * Operators page in the UI.
 */
import { WebSocket } from 'ws';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';

import { createLogger } from '../src/logger.js';
import { getConfig, LOCAL_GENESIS_SEED } from '../src/config.js';
import { MidnightWalletProvider, syncWallet } from '../src/wallet.js';
import { buildProviders } from '../src/providers.js';
import { deployAndSeed, reportLedger, writeDeployment } from '../src/scenario.js';
import { zkConfigPath } from '../contracts/index.js';

// @ts-expect-error WebSocket global assignment for apollo
globalThis.WebSocket = WebSocket;

const logger = createLogger('deploy');

// Local only. A headless wallet has no persisted dust state and rescans from
// genesis every run, which on a long-lived testnet is over a day of wall
// clock — so testnet deployment goes through a browser wallet instead, from
// the Operators page in the UI.
const network = 'local';
process.env['MIDNIGHT_NETWORK'] = network;

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

logger.info(`Deploying Aegis to '${network}'...`);

const wallet = await MidnightWalletProvider.build(logger, envConfig, { kind: 'seed', value: LOCAL_GENESIS_SEED });
await wallet.start();
await syncWallet(logger, wallet.wallet, Number(process.env['SYNC_TIMEOUT_MS'] ?? 4 * 60 * 60_000));
logger.info(`Wallet address: ${wallet.unshieldedKeystore.getBech32Address().toString()}`);

const providers = buildProviders(wallet, zkConfigPath, config);

const { contractAddress, record } = await deployAndSeed(logger, providers, network, config);
await reportLedger(logger, providers, contractAddress);

writeDeployment(record);
logger.info(`Wrote deployments/${network}.json`);

await wallet.stop();
process.exit(0);
