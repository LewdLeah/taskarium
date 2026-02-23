import ivm from 'isolated-vm';
import type { Phase } from '../types.ts';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ToolFn = (...args: any[]) => Promise<any>;
export type Tools = {
  read: ToolFn;
  list: ToolFn;
  call: ToolFn;
  write?: ToolFn;
  remove?: ToolFn;
  spawn?: ToolFn;
};
const wrap = (fn: ToolFn): ToolFn => async (...args: unknown[]) => JSON.stringify(await fn(...JSON.parse(args[0] as string)));
/** Build the isolate-side wrapper code that exposes tools as sync globals. */
const buildWrapperCode = (phase: Phase): string => {
  const behaviorTools = (phase === `behavior`)
    ? `const write = (...a) => { const r = JSON.parse(__write.applySyncPromise(null, [JSON.stringify(a)])); Object.assign(state, r.newState); return r.result; };
const remove = (...a) => { const r = JSON.parse(__remove.applySyncPromise(null, [JSON.stringify(a)])); Object.assign(state, r.newState); return r.result; };
const spawn = (...a) => { const r = JSON.parse(__spawn.applySyncPromise(null, [JSON.stringify(a)])); Object.assign(state, r.newState); return r.result; };`
    : ``;
  return `
const read = (...a) => { const r = JSON.parse(__read.applySyncPromise(null, [JSON.stringify(a)])); Object.assign(state, r.newState); return r.result; };
const list = (...a) => { const r = JSON.parse(__list.applySyncPromise(null, [JSON.stringify(a)])); Object.assign(state, r.newState); return r.result; };
const call = (...a) => { const r = JSON.parse(__call.applySyncPromise(null, [JSON.stringify(a)])); Object.assign(state, r.newState); return r.result; };
${behaviorTools}
`.trim();
};
/** Inject state and tool References into a context, return the wrapper code prefix. */
export const injectTools = (
  context: ivm.Context,
  tools: Tools,
  phase: Phase,
): string => {
  const g = context.global;
  g.setSync(`__read`, new ivm.Reference(wrap(tools.read)));
  g.setSync(`__list`, new ivm.Reference(wrap(tools.list)));
  g.setSync(`__call`, new ivm.Reference(wrap(tools.call)));
  if ((phase === `behavior`)) {
    g.setSync(`__write`, new ivm.Reference(wrap(tools.write!)));
    g.setSync(`__remove`, new ivm.Reference(wrap(tools.remove!)));
    g.setSync(`__spawn`, new ivm.Reference(wrap(tools.spawn!)));
  }
  return buildWrapperCode(phase);
};
