import { dirname } from 'node:path';
import type { Config } from '../types.ts';
import type { ToolContext } from '../tools/context.ts';
import { findTaskFiles } from './queue.ts';
import { maybeBootstrap } from './bootstrap.ts';
import { fireTask } from '../task/index.ts';
import { makeBudget } from '../budget/index.ts';
/** Start the watch loop: bootstrap if needed, then fill slots continuously. */
export const startWatch = async (rootPath: string, projectRoot: string, config: Config): Promise<void> => {
  const budget = makeBudget(config.population);
  maybeBootstrap(rootPath, projectRoot, config.population);
  let running = 0;
  let lastFire = 0;
  const tryFire = async (): Promise<void> => {
    while ((running < config.concurrency)) {
      const now = Date.now();
      const wait = config.rate - (now - lastFire);
      if ((wait > 0)) {
        await new Promise(r => setTimeout(r, wait));
      }
      const tasks = findTaskFiles(rootPath);
      if ((tasks.length === 0)) {
        break;
      }
      const filePath = tasks[0];
      const location = dirname(filePath);
      let taskSpent = 0;
      const ctx: ToolContext = {
        rootPath,
        location,
        config,
        remainingBudget: budget.remaining,
        spendBudget: (amount) => { taskSpent += amount; budget.spend(amount); },
        capBudget: budget.cap,
      };
      lastFire = Date.now();
      running++;
      (async () => {
        let taskBudget = 0;
        try {
          taskBudget = await fireTask(filePath, location, config, ctx);
        } catch (err) {
          console.error(`Task failed: ${filePath}`, err);
        }
        budget.redistribute(Math.max(0, taskBudget - taskSpent), findTaskFiles(rootPath));
        running--;
        void tryFire();
      })();
    }
    return;
  };
  const poll = async (): Promise<void> => {
    await tryFire();
    if (running === 0) maybeBootstrap(rootPath, projectRoot, config.population);
    await new Promise(r => setTimeout(r, 500));
    return poll();
  };
  return poll();
};
