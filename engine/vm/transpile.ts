import { transformSync } from 'esbuild';
/** Strip TypeScript types from an expression string, returning plain JS. */
export const transpile = (source: string): string => {
  return transformSync(source, { loader: `ts` }).code.trim();
};
