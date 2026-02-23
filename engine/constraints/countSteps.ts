import { relative } from 'node:path';
/** Count path steps between two absolute folder paths. */
export const countSteps = (from: string, to: string): number => {
  const rel = relative(from, to);
  if ((rel === ``)) {
    return 0;
  }
  return rel.split(/[/\\]/).filter(Boolean).length;
};
