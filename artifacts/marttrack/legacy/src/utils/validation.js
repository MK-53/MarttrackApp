export const validateItemName = (value) => {
  if (!value || !value.trim()) return "Name cannot be empty.";
  if (!/[A-Za-z]/.test(value)) return "Name must contain at least one letter.";
  return null;
};

export const WEIGHT_UNITS = ["kg", "g", "lb", "l", "ml"];

export const isWeightBasedUnit = (unit) =>
  WEIGHT_UNITS.includes(String(unit || "").trim().toLowerCase());

export const validatePositive = (value, integer = false) => {
  if (value === undefined || value === null || !String(value).trim())
    return "Value cannot be empty.";
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "Enter a number greater than zero.";
  if (integer && !Number.isInteger(num)) return "Value must be a whole number.";
  return null;
};

export const validateRequired = (value, label = "This field") => {
  if (!value || !String(value).trim()) return `${label} is required.`;
  return null;
};

const levenshtein = (a, b) => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

export const findSimilarNames = (input, existingNames, threshold = 0.7) => {
  const lower = input.toLowerCase().trim();
  return existingNames.filter(name => {
    const n = name.toLowerCase().trim();
    if (n === lower) return false;
    const longer = Math.max(n.length, lower.length);
    if (longer === 0) return false;
    const dist = levenshtein(lower, n);
    return (longer - dist) / longer >= threshold;
  });
};
