import { countSteps } from './countSteps.ts';
/** Throw if a folder is outside the task's range cone. Pass the folder itself, not a file inside it. */
export const assertFolderInRange = (location: string, folder: string, range: number): void => {
  const steps = countSteps(location, folder);
  if ((steps > range)) {
    throw new Error(`Path outside range (${steps} steps, limit ${range}): ${folder}`);
  }
  return;
};
