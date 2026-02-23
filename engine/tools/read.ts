import { readFileSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import type { State } from '../types.ts';
import type { ToolContext } from './context.ts';
import { resolvePath } from '../constraints/resolvePath.ts';
import { assertInRoot } from '../constraints/assertInRoot.ts';
import { assertFolderInVision } from '../constraints/assertFolderInVision.ts';
import { assertCharsLimit } from '../constraints/assertCharsLimit.ts';
/** Read a file and return its contents as a string. */
export const makeReadTool = (ctx: ToolContext, state: State) =>
  async (input: string): Promise<{ result: string; newState: State }> => {
    const resolved = resolvePath(ctx.location, input);
    assertInRoot(ctx.rootPath, resolved);
    assertFolderInVision(ctx.location, dirname(resolved), ctx.config.vision);
    if ((statSync(resolved).isDirectory())) {
      throw new Error(`read() cannot target a folder: ${input}`);
    }
    const content = readFileSync(resolved, `utf8`);
    if ((!resolved.endsWith(`.task`))) {
      assertCharsLimit(content, ctx.config.chars);
    }
    return { result: content, newState: state };
  };
