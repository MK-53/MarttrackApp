import { now } from "../utils/dates.js";

export const createAuditEvent = (counters, entityType, entityId, action, before, after, reason = null, details = null) => {
  return {
    id: counters.editId,
    entityType,
    entityId,
    action,
    before,
    after,
    reason,
    details,
    timestamp: now(),
  };
};

export const getAuditHistory = (state) => {
  return state.editHistory;
};
