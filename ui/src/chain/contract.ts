import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

import { Contract } from '@aegis/contract';
import { aegisWitnesses } from '@aegis/witnesses';

/**
 * The Aegis contract as the browser sees it.
 *
 * Identical to `contracts/index.ts` except for where the ZK material comes
 * from: the Node build points at a filesystem directory, which does not exist
 * here. The path below is inert — nothing in midnight-js reads it for a call
 * to an already-deployed contract — and the keys are actually fetched by
 * `FetchZkConfigProvider`.
 *
 * The witnesses are the same module the tests and the devnet suite use. The
 * browser gets no private copy of privacy-critical code.
 */
export const CompiledAegisContract = CompiledContract.make('AegisContract', Contract).pipe(
  CompiledContract.withWitnesses(aegisWitnesses),
  CompiledContract.withCompiledFileAssets('/zk'),
);

export type AegisContract = typeof Contract;
