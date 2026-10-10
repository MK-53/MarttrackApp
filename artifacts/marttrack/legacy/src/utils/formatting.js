import { DEFAULT_CURRENCY } from "../constants/config.js";

export const formatCurrency = (value, prefix = DEFAULT_CURRENCY) => {
  return `${prefix}${Number(value || 0).toFixed(2)}`;
};

export const formatNumber = (value, decimals = 0) => {
  return Number(value || 0).toFixed(decimals);
};

export const formatPercent = (value, decimals = 2) => {
  return `${Number(value || 0).toFixed(decimals)}%`;
};
