import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Config } from '../types.ts';
/** Load and parse config.json from the project root directory. */
export const loadConfig = (projectRoot: string): Config => {
  return JSON.parse(readFileSync(join(projectRoot, `config.json`), `utf8`)) as Config;
};
