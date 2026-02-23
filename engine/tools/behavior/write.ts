import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, basename } from 'node:path';
import type { State } from '../../types.ts';
import type { ToolContext } from '../context.ts';
import { resolvePath } from '../../constraints/resolvePath.ts';
import { assertInRoot } from '../../constraints/assertInRoot.ts';
import { assertFolderInRange } from '../../constraints/assertFolderInRange.ts';
import { assertDepthLimit } from '../../constraints/assertDepthLimit.ts';
import { assertFileLimit } from '../../constraints/assertFileLimit.ts';
import { assertCharsLimit } from '../../constraints/assertCharsLimit.ts';
const FILE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
/** Write content to a file, creating parent directories as needed. */
export const makeWriteTool = (ctx: ToolContext, state: State) =>
  async (input: string, content: string): Promise<{ result: string; newState: State }> => {
    const resolved = resolvePath(ctx.location, input);
    assertInRoot(ctx.rootPath, resolved);
    assertFolderInRange(ctx.location, dirname(resolved), ctx.config.range);
    if ((resolved.endsWith(`.task`))) {
      throw new Error(`write() cannot target .task files — use spawn()`);
    }
    const name = basename(resolved);
    if ((!FILE_NAME_RE.test(name))) {
      throw new Error(`Invalid filename: ${name}`);
    }
    const folder = dirname(resolved);
    assertDepthLimit(ctx.rootPath, folder, ctx.config.depth);
    assertFileLimit(folder, ctx.config.files);
    assertCharsLimit(content, ctx.config.chars);
    mkdirSync(folder, { recursive: true });
    writeFileSync(resolved, content, `utf8`);
    return { result: `written: ${input}`, newState: state };
  };
