import { relative } from 'node:path';
/** Return the depth of a folder relative to root (0 = root itself). */
export const folderDepth = (rootPath: string, folderPath: string): number => {
  const rel = relative(rootPath, folderPath);
  if ((rel === ``)) {
    return 0;
  }
  return rel.split(/[/\\]/).filter(Boolean).length;
};
