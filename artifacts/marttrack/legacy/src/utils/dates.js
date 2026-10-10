export const now = () => new Date().toISOString();

export const formatDate = (isoString) => {
  return new Date(isoString).toLocaleDateString();
};

export const formatDateTime = (isoString) => {
  return new Date(isoString).toLocaleString();
};

export const isToday = (isoString) => {
  const date = new Date(isoString);
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isThisWeek = (isoString) => {
  const date = new Date(isoString);
  const today = new Date();
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(today.getDate() - 7);
  return date >= oneWeekAgo && date <= today;
};

export const isThisMonth = (isoString) => {
  const date = new Date(isoString);
  const today = new Date();
  return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
};
