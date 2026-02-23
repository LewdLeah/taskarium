/** Coerce any value to a short informational string. */
export const coerce = (value: unknown): string => {
  if ((typeof value === `string`)) {
    return value;
  }
  const preview = JSON.stringify(value);
  const trimmed = (preview !== undefined ? preview : String(value)).slice(0, 80);
  return `[${typeof value}] ${trimmed}`;
};
