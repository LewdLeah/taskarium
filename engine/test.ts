/**
 * Quick diagnostic test: does spawn actually create a .task file?
 * Run: npx tsx engine/test.ts
 */
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { State, Config } from './types.ts';
import { runBehavior } from './task/behavior.ts';
import { makeReadTool } from './tools/read.ts';
import { makeListTool } from './tools/list.ts';
import { makeCallTool } from './tools/call.ts';
import { makeWriteTool } from './tools/behavior/write.ts';
import { makeRemoveTool } from './tools/behavior/remove.ts';
import { makeSpawnTool } from './tools/behavior/spawn.ts';

const root = mkdtempSync(join(tmpdir(), `taskarium-test-`));
console.log(`Root: ${root}`);

const config: Config = {
  model: `test`, population: 100, concurrency: 1, rate: 0,
  vision: 9999, range: 5, depth: 5, chars: 10000, files: 20,
  folders: 6, memory: 64, timeout: 5000, size: 50000, murder: false,
};

const state: State = {
  genome: [],
  budget: 10,
  location: root,
  errors: [],
};

let spent = 0;
const ctx = {
  rootPath: root,
  location: root,
  config,
  remainingBudget: () => 100 - spent,
  spendBudget: (n: number) => { spent += n; },
  capBudget: (n: number) => Math.min(n, 100 - spent),
};

const tools = {
  read: makeReadTool(ctx, state),
  list: makeListTool(ctx, state),
  call: makeCallTool(ctx, state, `behavior`),
  write: makeWriteTool(ctx, state),
  remove: makeRemoveTool(ctx, state),
  spawn: makeSpawnTool(ctx, state),
};

// Simulate what runBehavior does with a model output that calls spawn.
// Use JS object literal syntax (single quotes) so it's valid JSON when embedded in the outer array.
const modelOutput = String.raw`["spawn('./child/', [{role: 'system', evals: ['` + "`hello`" + String.raw`']}], 3)"]`;
console.log(`Behavior input: ${modelOutput}`);

const finalState = await runBehavior(modelOutput, state, tools, config.memory, config.timeout);

console.log(`Errors: ${JSON.stringify(finalState.errors)}`);
console.log(`Root contents: ${JSON.stringify(readdirSync(root))}`);

const childDir = join(root, `child`);
try {
  const childContents = readdirSync(childDir);
  console.log(`child/ contents: ${JSON.stringify(childContents)}`);
  if (childContents.length > 0) {
    console.log(`PASS: .task file created`);
  } else {
    console.log(`FAIL: child/ is empty`);
  }
} catch {
  console.log(`FAIL: child/ directory was not created`);
}

rmSync(root, { recursive: true });
