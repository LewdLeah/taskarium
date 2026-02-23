import { resolve } from 'node:path';
/** Resolve a user-supplied path against the task's location folder. */
export const resolvePath = (location: string, input: string): string => {
  return resolve(location, input);
};
