import { relative } from 'node:path';
/** Throw if the resolved path escapes the root directory. */
export const assertInRoot = (rootPath: string, resolved: string): void => {
  const rel = relative(rootPath, resolved);
  if ((rel.startsWith(`..`))) {
    throw new Error(`Path escapes root: ${resolved}`);
  }
  return;
};
