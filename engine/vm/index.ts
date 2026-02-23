import ivm from 'isolated-vm';
import type { State, Phase, ExprResult } from '../types.ts';
import type { Tools } from './setup.ts';
import { injectTools } from './setup.ts';
import { transpile } from './transpile.ts';
import { coerce } from './coerce.ts';
/** Run a single TypeScript expression in an isolated VM, returning output and updated state. */
export const runExpr = async (
  expr: string,
  state: State,
  tools: Tools,
  phase: Phase,
  memory: number,
  timeout: number,
): Promise<ExprResult> => {
  const isolate = new ivm.Isolate({ memoryLimit: memory });
  const context = isolate.createContextSync();
  const wrapperCode = injectTools(context, tools, phase);
  context.global.setSync(`state`, new ivm.ExternalCopy(state).copyInto());
  const js = transpile(`(() => (${expr}))()`);
  const script = isolate.compileScriptSync(`${wrapperCode}\n${js}`);
  let raw: unknown;
  let newState: State;
  try {
    raw = await script.run(context, { timeout });
    newState = (context.global.getSync(`state`, { reference: true }) as ivm.Reference<State>).copySync();
  } finally {
    isolate.dispose();
  }
  return { output: coerce(raw), state: newState! };
};
