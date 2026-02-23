import type { State, TaskFile } from '../types.ts';
/** Initialize the mutable runtime state for a task. */
export const initState = (task: TaskFile, location: string): State => {
  return {
    genome: task.genome,
    budget: task.budget,
    location,
    errors: [],
  };
};
