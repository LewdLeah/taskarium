import { countSteps } from './countSteps.ts';
/** Throw if a folder is outside the task's vision cone. Pass the folder itself, not a file inside it. */
export const assertFolderInVision = (location: string, folder: string, vision: number): void => {
  const steps = countSteps(location, folder);
  if ((steps > vision)) {
    throw new Error(`Path outside vision (${steps} steps, limit ${vision}): ${folder}`);
  }
  return;
};
