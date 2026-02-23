import { readdirSync } from 'node:fs';
/** Throw if a folder already contains >= folders subfolders. Non-existent folders pass (count = 0). */
export const assertFolderLimit = (folderPath: string, folders: number): void => {
  let entries;
  try {
    entries = readdirSync(folderPath, { withFileTypes: true });
  } catch {
    return;
  }
  const count = entries.filter(e => e.isDirectory()).length;
  if ((count >= folders)) {
    throw new Error(`Folder already has ${count} subfolders (limit ${folders}): ${folderPath}`);
  }
  return;
};
