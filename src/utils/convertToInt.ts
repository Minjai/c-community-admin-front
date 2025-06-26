/**
 * Converts a boolean or string value to an integer (1 for true/1, 0 for false/0)
 * @param value The value to convert
 * @returns 1 for true/1, 0 for false/0
 */
export const convertToInt = (value: boolean | string | number): number => {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "string") {
    return value === "1" || value.toLowerCase() === "true" ? 1 : 0;
  }
  return value === 1 ? 1 : 0;
};
