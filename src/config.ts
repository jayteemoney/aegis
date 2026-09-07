export type NetworkConfig = {
  networkId: string;
  indexer: string;
  indexerWS: string;
  node: string;
  nodeWS: string;
  proofServer: string;
  // Human-facing faucet page for topping up test wallets. Not a programmatic
  // drip endpoint — the tests assume seeds in .env.<network> are pre-funded.
  // The faucet dispenses tNIGHT only; DUST for fees comes from registering
  // that NIGHT afterwards, which a browser wallet does from its own UI.
  faucet: string;
};

/**
 * The local devnet's genesis account.
 *
 * The `dev` chain preset pre-funds it with both tNIGHT and DUST, which is why
 * a local deploy needs no faucet and no delegation — and why `local` is the
 * network the end-to-end demo runs on. Publishing the seed is harmless: it
 * only holds value on a throwaway chain that lives inside `docker compose`.
 */
/**
 * Env lookup that also works in a browser bundle.
 *
 * These configs are imported by the UI as well as the Node scripts, and
 * `process` does not exist in a browser. Reading through this guard keeps one
 * definition of the network endpoints rather than a second copy for the web.
 */
const env = (key: string): string | undefined =>
  typeof process === 'undefined' ? undefined : process.env[key];

export const LOCAL_GENESIS_SEED =
  '0000000000000000000000000000000000000000000000000000000000000001';

export const LOCAL_CONFIG: NetworkConfig = {
  networkId: 'undeployed',
  indexer: 'http://127.0.0.1:8088/api/v4/graphql',
  indexerWS: 'ws://127.0.0.1:8088/api/v4/graphql/ws',
  node: 'http://127.0.0.1:9944',
  nodeWS: 'ws://127.0.0.1:9944',
  proofServer: 'http://127.0.0.1:6300',
  faucet: '',
};

export const PREVIEW_CONFIG: NetworkConfig = {
  networkId: 'preview',
  indexer: 'https://indexer.preview.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preview.midnight.network',
  nodeWS: 'wss://rpc.preview.midnight.network',
  proofServer: env('MIDNIGHT_PROOF_SERVER') ?? 'http://127.0.0.1:6300',
  faucet: 'https://midnight-tmnight-preview.nethermind.dev/',
};

export const PREPROD_CONFIG: NetworkConfig = {
  networkId: 'preprod',
  indexer: 'https://indexer.preprod.midnight.network/api/v4/graphql',
  indexerWS: 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws',
  node: 'https://rpc.preprod.midnight.network',
  nodeWS: 'wss://rpc.preprod.midnight.network',
  proofServer: env('MIDNIGHT_PROOF_SERVER') ?? 'http://127.0.0.1:6300',
  faucet: 'https://midnight-tmnight-preprod.nethermind.dev/',
};

/** Every network the project knows about, keyed by name. */
export const NETWORKS: Record<string, NetworkConfig> = {
  get local() {
    return LOCAL_CONFIG;
  },
  get preview() {
    return PREVIEW_CONFIG;
  },
  get preprod() {
    return PREPROD_CONFIG;
  },
};

export function getConfig(): NetworkConfig {
  const network = env('MIDNIGHT_NETWORK') ?? 'local';
  if (network === 'local') return LOCAL_CONFIG;
  if (network === 'preview') return PREVIEW_CONFIG;
  if (network === 'preprod') return PREPROD_CONFIG;
  throw new Error(
    `Unknown network: ${network}. Supported: 'local', 'preview', 'preprod'.`,
  );
}
