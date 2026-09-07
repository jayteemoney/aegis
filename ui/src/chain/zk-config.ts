import {
  createProverKey,
  createVerifierKey,
  createZKIR,
  ZKConfigProvider,
  type ProverKey,
  type VerifierKey,
  type ZKIR,
} from '@midnight-ntwrk/midnight-js-types';

/** The circuits Aegis can call from a transaction. */
export type AegisCircuitId =
  | 'ping'
  | 'attestPatientRecord'
  | 'registerTrial'
  | 'checkTrialEligibility';

/**
 * Serves the compiler's proving material over HTTP.
 *
 * The Node provider reads these from disk; in the browser they are static
 * assets under `public/zk`, copied there by `scripts/copy-zk.mjs`. The layout
 * mirrors `contracts/managed/aegis` exactly so the two providers stay
 * interchangeable — same names, same extensions, same circuit ids.
 *
 * These are proving and verifying keys, not secrets: they are derived from the
 * public circuit and are the same for every user. What stays private is the
 * witness data fed into them, which never leaves this tab.
 */
export class FetchZkConfigProvider<K extends string> extends ZKConfigProvider<K> {
  constructor(private readonly baseUrl: string = '/zk') {
    super();
  }

  private async fetchBytes(subDir: string, circuitId: K, ext: string): Promise<Uint8Array> {
    // Circuit ids come from our own union type, never from user input, but
    // keep the guard so a future caller cannot walk out of the asset root.
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(circuitId)) {
      throw new Error(`Invalid circuitId: ${JSON.stringify(circuitId)}`);
    }
    const url = `${this.baseUrl}/${subDir}/${circuitId}${ext}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Could not load ${url} (${response.status}). Run \`yarn zk:copy\` to publish the ` +
          'compiler output into ui/public/zk.',
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  getProverKey(circuitId: K): Promise<ProverKey> {
    return this.fetchBytes('keys', circuitId, '.prover').then(createProverKey);
  }

  getVerifierKey(circuitId: K): Promise<VerifierKey> {
    return this.fetchBytes('keys', circuitId, '.verifier').then(createVerifierKey);
  }

  getZKIR(circuitId: K): Promise<ZKIR> {
    return this.fetchBytes('zkir', circuitId, '.bzkir').then(createZKIR);
  }
}

/**
 * Warm the browser cache for a circuit's proving key.
 *
 * The key for `checkTrialEligibility` is about 5 MB, and it does not compress —
 * it is high-entropy cryptographic material, so gzip saves under 1%. It is
 * fetched lazily, only when a proof is actually submitted, which keeps it off
 * the critical path for everyone who is just reading the ledger.
 *
 * The cost is that the first submission pays the download. Connecting a wallet
 * is a strong signal that a submission is coming, so start the fetch then and
 * let the HTTP cache hold it. Failures are ignored on purpose: this is an
 * optimisation, and the real fetch will report any genuine problem.
 */
export function prefetchProvingKey(
  circuitId: AegisCircuitId = 'checkTrialEligibility',
  baseUrl = '/zk',
): void {
  void fetch(`${baseUrl}/keys/${circuitId}.prover`, { cache: 'force-cache' }).catch(() => {});
}
