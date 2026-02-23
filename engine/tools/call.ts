import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';
import ivm from 'isolated-vm';
import { dirname } from 'node:path';
import type { State, GenomeEntry, Phase } from '../types.ts';
import type { ToolContext } from './context.ts';
import { resolvePath } from '../constraints/resolvePath.ts';
import { assertInRoot } from '../constraints/assertInRoot.ts';
import { assertFolderInVision } from '../constraints/assertFolderInVision.ts';
import { injectTools } from '../vm/setup.ts';

/** Execute a .ts function file, returning its result and updated state. */
export const makeCallTool = (ctx: ToolContext, state: State, phase: Phase) =>
  async (input: string, ...args: unknown[]): Promise<{ result: unknown; newState: State }> => {
    const resolved = resolvePath(ctx.location, input);
    assertInRoot(ctx.rootPath, resolved);
    assertFolderInVision(ctx.location, dirname(resolved), ctx.config.vision);
    if ((!resolved.endsWith(`.ts`))) {
      throw new Error(`call() requires a .ts file: ${input}`);
    }
    const source = readFileSync(resolved, `utf8`);
    const js = transformSync(source, { loader: `ts`, format: `cjs` }).code.trim();
    const isolate = new ivm.Isolate({ memoryLimit: ctx.config.memory });
    const context = isolate.createContextSync();
    const tools = makeCallTools(ctx, state, phase);
    const wrapperCode = injectTools(context, tools, phase);
    context.global.setSync(`state`, new ivm.ExternalCopy(state).copyInto());
    context.global.setSync(`__args`, new ivm.ExternalCopy(args).copyInto());
    const script = isolate.compileScriptSync(`${wrapperCode}\nconst exports = {};\nconst module = { exports };\n${js}\nJSON.stringify((module.exports.default || module.exports)(...__args))`);
    let raw: string | undefined;
    let newState: State;
    try {
      raw = await script.run(context, { timeout: ctx.config.timeout }) as string | undefined;
      newState = (context.global.getSync(`state`, { reference: true }) as ivm.Reference<State>).copySync();
    } finally {
      isolate.dispose();
    }
    const result = (raw !== undefined && raw !== null) ? JSON.parse(raw) : undefined;
    return { result, newState: newState! };
  };
const makeCallTools = (ctx: ToolContext, state: State, phase: Phase) => ({
  read: async (...a: unknown[]) => {
    const { makeReadTool } = await import('./read.ts');
    return makeReadTool(ctx, state)(a[0] as string);
  },
  list: async (...a: unknown[]) => {
    const { makeListTool } = await import('./list.ts');
    return makeListTool(ctx, state)(a[0] as string);
  },
  call: async (...a: unknown[]) => makeCallTool(ctx, state, phase)(a[0] as string, ...a.slice(1)),
  ...(phase === `behavior` ? {
    write: async (...a: unknown[]) => {
      const { makeWriteTool } = await import('./behavior/write.ts');
      return makeWriteTool(ctx, state)(a[0] as string, a[1] as string);
    },
    remove: async (...a: unknown[]) => {
      const { makeRemoveTool } = await import('./behavior/remove.ts');
      return makeRemoveTool(ctx, state)(a[0] as string);
    },
    spawn: async (...a: unknown[]) => {
      const { makeSpawnTool } = await import('./behavior/spawn.ts');
      return makeSpawnTool(ctx, state)(a[0] as string, a[1] as GenomeEntry[], a[2] as number);
    },
  } : {}),
});
