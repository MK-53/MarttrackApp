export const STORE_ROLES = Object.freeze({
  OWNER: "owner",
  SELLER: "seller",
});

const OWNER_ACTIONS = new Set([
  "ADD_STOCK",
  "EDIT_BATCH",
  "PROCESS_RETURN",
  "EDIT_ITEM",
  "ADD_SUPPLIER_QUOTE",
  "UPDATE_SETTINGS",
]);

export const canPerformAction = (role, actionType) => {
  if (role === STORE_ROLES.OWNER) {
    return OWNER_ACTIONS.has(actionType) || actionType === "RECORD_SALE";
  }

  return role === STORE_ROLES.SELLER && actionType === "RECORD_SALE";
};
