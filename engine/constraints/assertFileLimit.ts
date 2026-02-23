import { readdirSync } from 'node:fs';
/** Throw if a folder already contains >= files non-.task files. Non-existent folders pass (count = 0). */
export const assertFileLimit = (folderPath: string, files: number): void => {
  let entries;
  try {
    entries = readdirSync(folderPath, { withFileTypes: true });
  } catch {
    return;
  }
  const count = entries.filter(e => (e.isFile() && !e.name.endsWith(`.task`))).length;
  if ((count >= files)) {
    throw new Error(`Folder already has ${count} files (limit ${files}): ${folderPath}`);
  }
  return;
};
