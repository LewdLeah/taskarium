/** Throw if a string's length exceeds the chars limit. */
export const assertCharsLimit = (content: string, chars: number): void => {
  if ((content.length > chars)) {
    throw new Error(`File content exceeds ${chars} character limit (got ${content.length})`);
  }
  return;
};
