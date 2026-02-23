import { rmSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { State } from '../../types.ts';
import type { ToolContext } from '../context.ts';
import { resolvePath } from '../../constraints/resolvePath.ts';
import { assertInRoot } from '../../constraints/assertInRoot.ts';
import { assertFolderInRange } from '../../constraints/assertFolderInRange.ts';
/** Recursively remove a file or folder. Throws if any .task file is in the subtree and murder is disabled. */
export const makeRemoveTool = (ctx: ToolContext, state: State) =>
  async (input: string): Promise<{ result: string; newState: State }> => {
    const resolved = resolvePath(ctx.location, input);
    assertInRoot(ctx.rootPath, resolved);
    if ((resolved === ctx.rootPath)) {
      throw new Error(`remove() cannot target the root folder`);
    }
    const isDir = statSync(resolved).isDirectory();
    assertFolderInRange(ctx.location, isDir ? resolved : dirname(resolved), ctx.config.range);
    if ((!ctx.config.murder)) {
      assertNoTaskFiles(resolved);
    }
    rmSync(resolved, { recursive: true, force: true });
    return { result: `removed: ${input}`, newState: state };
  };
const assertNoTaskFiles = (target: string): void => {
  let isDir: boolean;
  try {
    isDir = statSync(target).isDirectory();
  } catch {
    return;
  }
  if ((!isDir)) {
    if ((target.endsWith(`.task`))) {
      throw new Error(`remove() cannot delete .task files when murder is disabled: ${target}`);
    }
    return;
  }
  for (const name of readdirSync(target)) {
    assertNoTaskFiles(join(target, name));
  }
  return;
};
