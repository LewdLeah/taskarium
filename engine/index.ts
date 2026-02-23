import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { loadConfig } from './config/index.ts';
import { startWatch } from './watch/index.ts';
const projectRoot = join(import.meta.dirname, `..`);
const config = loadConfig(projectRoot);
const rootPath = join(projectRoot, `root`);
mkdirSync(rootPath, { recursive: true });
startWatch(rootPath, projectRoot, config).catch(err => {
  console.error(`Fatal error:`, err);
  process.exit(1);
});
