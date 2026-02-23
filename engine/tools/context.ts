import type { Config } from '../types.ts';
/** Shared context passed to all tool implementations. */
export type ToolContext = {
  rootPath: string;
  location: string;
  config: Config;
  remainingBudget: () => number;
  spendBudget: (amount: number) => void;
  capBudget: (requested: number) => number;
};
