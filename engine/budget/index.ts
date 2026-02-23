import { readFileSync, writeFileSync } from 'node:fs';
/** Manages the conserved global budget pool. */
export const makeBudget = (population: number) => {
  let balance = population;
  let reserve = 0;
  const spend = (amount: number): void => {
    if ((balance <= 0)) {
      throw new Error(`Engine budget exhausted`);
    }
    balance -= Math.min(amount, balance);
    return;
  };
  const cap = (requested: number): number => {
    return Math.min(requested, balance);
  };
  /** Redistribute unspent task budget to a random queued task file, or hold in reserve. */
  const redistribute = (unspent: number, taskFiles: string[]): void => {
    const total = unspent + reserve;
    if ((total <= 0)) {
      return;
    }
    if ((taskFiles.length === 0)) {
      reserve = total;
      return;
    }
    const target = taskFiles[Math.floor(Math.random() * taskFiles.length)];
    try {
      const parsed = JSON.parse(readFileSync(target, `utf8`)) as { genome: unknown; budget: number };
      parsed.budget += total;
      writeFileSync(target, JSON.stringify(parsed, null, 2), `utf8`);
      balance += total;
      reserve = 0;
    } catch {
      reserve = total;
    }
    return;
  };
  const remaining = (): number => balance;
  return { spend, cap, redistribute, remaining };
};
