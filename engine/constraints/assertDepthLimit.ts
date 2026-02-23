import { folderDepth } from './folderDepth.ts';
/** Throw if the folder path exceeds the depth limit relative to root. */
export const assertDepthLimit = (rootPath: string, folderPath: string, depth: number): void => {
  const d = folderDepth(rootPath, folderPath);
  if ((d > depth)) {
    throw new Error(`Folder depth ${d} exceeds limit ${depth}: ${folderPath}`);
  }
  return;
};
