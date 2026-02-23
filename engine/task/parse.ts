import { readFileSync } from 'node:fs';
import type { TaskFile } from '../types.ts';
/** Parse a .task file from disk. Throws if invalid JSON or missing required fields. */
export const parseTask = (filePath: string): TaskFile => {
  const raw = readFileSync(filePath, `utf8`);
  return parseTaskContent(raw, filePath);
};
/** Parse task content from a string. Throws if invalid JSON or missing required fields. */
export const parseTaskContent = (raw: string, filePath: string): TaskFile => {
  const parsed = JSON.parse(raw) as TaskFile;
  if ((!Array.isArray(parsed.genome) || typeof parsed.budget !== `number`)) {
    throw new Error(`Invalid .task file: ${filePath}`);
  }
  return parsed;
};
