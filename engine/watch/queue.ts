import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
/** Recursively find all .task files under root, sorted by timestamp ascending. */
export const findTaskFiles = (rootPath: string): string[] => {
  const results: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const stat = statSync(full);
      if ((stat.isDirectory())) {
        walk(full);
      } else if ((name.endsWith(`.task`))) {
        results.push(full);
      }
    }
    return;
  };
  walk(rootPath);
  results.sort();
  return results;
};
