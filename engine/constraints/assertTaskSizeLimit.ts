/** Throw if a serialized .task string exceeds the size limit in bytes. */
export const assertTaskSizeLimit = (serialized: string, size: number): void => {
  const bytes = Buffer.byteLength(serialized, `utf8`);
  if ((bytes > size)) {
    throw new Error(`.task file exceeds ${size} byte limit (got ${bytes})`);
  }
  return;
};
