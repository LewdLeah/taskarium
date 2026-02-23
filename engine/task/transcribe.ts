import type { State, GenomeEntry, ContextMessage } from '../types.ts';
import type { Tools } from '../vm/setup.ts';
import { runExpr } from '../vm/index.ts';
/** Run all genome evals and build the model context array. Respects a shared deadline. */
export const transcribe = async (
  genome: GenomeEntry[],
  state: State,
  tools: Tools,
  memory: number,
  timeout: number,
): Promise<{ context: ContextMessage[]; state: State }> => {
  const deadline = Date.now() + timeout;
  let current = state;
  const context: ContextMessage[] = [];
  for (const entry of genome) {
    let content = ``;
    for (const expr of entry.evals) {
      if (expr == null) continue;
      const remaining = deadline - Date.now();
      if ((remaining <= 0)) {
        const preview = expr.slice(0, 40);
        const msg = `[timeout] skipped: ${preview}`;
        current.errors.push(msg);
        content += msg;
        continue;
      }
      try {
        const result = await runExpr(expr, current, tools, `genome`, memory, remaining);
        current = result.state;
        content += result.output;
      } catch (err) {
        const msg = `[error] ${String(err)}`;
        current.errors.push(msg);
        content += msg;
      }
    }
    context.push({ role: entry.role, content });
  }
  return { context, state: current };
};
