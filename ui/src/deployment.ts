import type { DeploymentInfo } from '@aegis/chain';

/**
 * Deployment records written by `scripts/deploy.ts`.
 *
 * Loaded with a glob so the app still builds and runs before the contract has
 * ever been deployed — in that case the UI falls back to local simulation and
 * says so, rather than showing a broken chain panel.
 */
const records = import.meta.glob('../../deployments/*.json', {
  eager: true,
}) as Record<string, { default: DeploymentInfo }>;

export const DEPLOYMENTS: DeploymentInfo[] = Object.values(records).map((m) => m.default);

/**
 * Preferred deployment, in order: an explicit `?network=` in the URL, then
 * whatever `VITE_NETWORK` names, then the first record found.
 *
 * The query parameter exists so a reviewer holding one link can switch between
 * a public testnet deployment and a local one without a rebuild.
 */
const requestedNetwork = (): string => {
  if (typeof window !== 'undefined') {
    const fromUrl = new URLSearchParams(window.location.search).get('network');
    if (fromUrl) return fromUrl;
  }
  return import.meta.env['VITE_NETWORK'] ?? 'preview';
};

/**
 * The network this session is aimed at, whether or not a contract has been
 * deployed there yet. A first deploy has no record to read a network from, so
 * connecting a wallet needs this rather than ACTIVE_DEPLOYMENT.
 */
export const TARGET_NETWORK: string = requestedNetwork();

export const ACTIVE_DEPLOYMENT: DeploymentInfo | null =
  DEPLOYMENTS.find((d) => d.network === TARGET_NETWORK) ?? DEPLOYMENTS[0] ?? null;

export const IS_DEPLOYED = ACTIVE_DEPLOYMENT !== null;

export const explorerHint = (d: DeploymentInfo): string =>
  `${d.network} · ${d.contractAddress.slice(0, 10)}…${d.contractAddress.slice(-6)}`;
