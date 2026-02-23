import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { GenomeEntry } from '../types.ts';
import { findTaskFiles } from './queue.ts';
/** If no .task files exist under root, create a bootstrap task from bootstrap.json. */
export const maybeBootstrap = (rootPath: string, projectRoot: string, population: number): void => {
  if ((findTaskFiles(rootPath).length > 0)) {
    return;
  }
  const bootstrapPath = join(projectRoot, `bootstrap.json`);
  if ((!existsSync(bootstrapPath))) {
    return;
  }
  const genome = JSON.parse(readFileSync(bootstrapPath, `utf8`)) as GenomeEntry[];
  const task = { genome, budget: population };
  const filename = `\u03A9${Date.now()}.task`;
  writeFileSync(join(rootPath, filename), JSON.stringify(task, null, 2), `utf8`);
  return;
};
