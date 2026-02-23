import type { State } from '../types.ts';
import type { Tools } from '../vm/setup.ts';
import { runExpr } from '../vm/index.ts';
/** Parse and execute behavior operations from the model's raw output. */
export const runBehavior = async (
  raw: string,
  state: State,
  tools: Tools,
  memory: number,
  timeout: number,
): Promise<State> => {
  const start = raw.indexOf(`[`);
  const end = raw.lastIndexOf(`]`);
  if ((start === -1 || end === -1 || end <= start)) {
    return state;
  }
  let ops: string[];
  try {
    ops = JSON.parse(raw.slice(start, end + 1)) as string[];
  } catch {
    return state;
  }
  const deadline = Date.now() + timeout;
  let current = state;
  for (const op of ops) {
    const remaining = deadline - Date.now();
    if ((remaining <= 0)) {
      current.errors.push(`[timeout] skipped operation`);
      break;
    }
    try {
      const result = await runExpr(op, current, tools, `behavior`, memory, remaining);
      current = result.state;
    } catch (err) {
      current.errors.push(`[error] ${String(err)}`);
    }
  }
  return current;
};
