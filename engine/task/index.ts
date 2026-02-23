import { readFileSync, unlinkSync } from 'node:fs';
import type { Config } from '../types.ts';
import type { ToolContext } from '../tools/context.ts';
import { parseTaskContent } from './parse.ts';
import { initState } from './state.ts';
import { transcribe } from './transcribe.ts';
import { runBehavior } from './behavior.ts';
import { callModel } from '../model/index.ts';
import { makeReadTool } from '../tools/read.ts';
import { makeListTool } from '../tools/list.ts';
import { makeCallTool } from '../tools/call.ts';
import { makeWriteTool } from '../tools/behavior/write.ts';
import { makeRemoveTool } from '../tools/behavior/remove.ts';
import { makeSpawnTool } from '../tools/behavior/spawn.ts';
/** Fire a single task: parse, delete, transcribe, model, behavior. Returns original task budget. */
export const fireTask = async (
  filePath: string,
  location: string,
  config: Config,
  ctx: ToolContext,
): Promise<number> => {
  const raw = readFileSync(filePath, `utf8`);
  unlinkSync(filePath);
  const task = parseTaskContent(raw, filePath);
  let state = initState(task, location);
  const genomeTools = {
    read: makeReadTool(ctx, state),
    list: makeListTool(ctx, state),
    call: makeCallTool(ctx, state, `genome`),
  };
  console.log(`[task] firing: ${filePath}`);
  const transcribed = await transcribe(task.genome, state, genomeTools, config.memory, config.timeout);
  state = transcribed.state;
  console.log(`[task] context:\n${JSON.stringify(transcribed.context, null, 2)}\n`);
  console.log(`[task] calling model...`);
  const modelOutput = await callModel(transcribed.context, config);
  console.log(`[task] model output:\n${modelOutput}\n`);
  const behaviorTools = {
    read: makeReadTool(ctx, state),
    list: makeListTool(ctx, state),
    call: makeCallTool(ctx, state, `behavior`),
    write: makeWriteTool(ctx, state),
    remove: makeRemoveTool(ctx, state),
    spawn: makeSpawnTool(ctx, state),
  };
  const finalState = await runBehavior(modelOutput, state, behaviorTools, config.memory, config.timeout);
  if (finalState.errors.length > 0) {
    console.log(`[task] errors:\n${finalState.errors.join('\n')}\n`);

  }
  return task.budget;
};
