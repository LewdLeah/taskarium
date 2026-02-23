import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, sep } from 'node:path';
import type { State, GenomeEntry } from '../../types.ts';
import type { ToolContext } from '../context.ts';
import { resolvePath } from '../../constraints/resolvePath.ts';
import { assertInRoot } from '../../constraints/assertInRoot.ts';
import { assertFolderInRange } from '../../constraints/assertFolderInRange.ts';
import { assertDepthLimit } from '../../constraints/assertDepthLimit.ts';
import { assertFolderLimit } from '../../constraints/assertFolderLimit.ts';
import { assertTaskSizeLimit } from '../../constraints/assertTaskSizeLimit.ts';
/** Spawn a new .task file at a location, deducting budget from the engine pool. */
export const makeSpawnTool = (ctx: ToolContext, state: State) =>
  async (locationInput: string, genome: GenomeEntry[], requested: number): Promise<{ result: number; newState: State }> => {
    const locationResolved = resolvePath(ctx.location, locationInput);
    assertInRoot(ctx.rootPath, locationResolved);
    assertFolderInRange(ctx.location, locationResolved, ctx.config.range);
    assertDepthLimit(ctx.rootPath, locationResolved, ctx.config.depth);
    const parentFolder = dirname(locationResolved);
    if (!existsSync(locationResolved) && parentFolder !== locationResolved && (parentFolder === ctx.rootPath || parentFolder.startsWith(ctx.rootPath + sep))) {
      assertFolderLimit(parentFolder, ctx.config.folders);
    }
    const budget = ctx.capBudget(requested);
    if ((budget <= 0)) {
      throw new Error(`Engine budget exhausted`);
    }
    ctx.spendBudget(budget);
    const taskFile = { genome, budget };
    const serialized = JSON.stringify(taskFile, null, 2);
    assertTaskSizeLimit(serialized, ctx.config.size);
    const timestamp = Date.now();
    const filename = `\u03A9${timestamp}.task`;
    mkdirSync(locationResolved, { recursive: true });
    writeFileSync(join(locationResolved, filename), serialized, `utf8`);
    return { result: ctx.remainingBudget(), newState: state };
  };
