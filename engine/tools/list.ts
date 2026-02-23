import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { State } from '../types.ts';
import type { ToolContext } from './context.ts';
import { resolvePath } from '../constraints/resolvePath.ts';
import { assertInRoot } from '../constraints/assertInRoot.ts';
import { assertFolderInVision } from '../constraints/assertFolderInVision.ts';
/** List immediate children of a folder, returning absolute filesystem paths. */
export const makeListTool = (ctx: ToolContext, state: State) =>
  async (input: string): Promise<{ result: string[]; newState: State }> => {
    const resolved = resolvePath(ctx.location, input);
    assertInRoot(ctx.rootPath, resolved);
    assertFolderInVision(ctx.location, resolved, ctx.config.vision);
    const entries = readdirSync(resolved);
    const result = entries.map(name => {
      const full = join(resolved, name);
      const isDir = statSync(full).isDirectory();
      return full + (isDir ? `/` : ``);
    });
    return { result, newState: state };
  };
