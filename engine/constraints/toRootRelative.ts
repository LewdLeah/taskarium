import { relative } from 'node:path';
/** Convert an absolute path to a root-relative path with a leading slash. */
export const toRootRelative = (rootPath: string, absolute: string): string => {
  return `/` + relative(rootPath, absolute).replace(/\\/g, `/`);
};
