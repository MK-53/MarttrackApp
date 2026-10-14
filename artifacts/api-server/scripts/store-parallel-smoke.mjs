import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const baseUrl = (process.env.STORE_HOST_URL || "http://127.0.0.1:8080").replace(/\/+$/, "");
if (process.env.STORE_SMOKE_CREATE !== "1") {
  throw new Error(
    "This test creates a persistent disposable store. Re-run with STORE_SMOKE_CREATE=1 after confirming the database is for development.",
  );
}

const request = async (path, { token, method = "GET", body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
};

const created = await request("/store", {
  method: "POST",
  body: {
    name: `MartTrack smoke ${new Date().toISOString()}`,
    ownerName: "Development smoke test",
    pin: String(Math.floor(1000 + Math.random() * 9000)),
  },
});
assert.equal(created.response.status, 201, JSON.stringify(created.json));

const { storeId, accessToken, state } = created.json;
assert.ok(storeId && accessToken && state, "The host should return the new store credentials and state");

const addStock = await request("/store/actions", {
  method: "POST",
  token: accessToken,
  body: {
    storeId,
    actionId: randomUUID(),
    type: "ADD_STOCK",
    payload: {
      itemName: "Concurrent sale test item",
      targetPrice: 12,
      unitType: "unit",
      totalCost: 35,
      quantity: 7,
      isNewItem: true,
    },
  },
});
assert.equal(addStock.response.status, 200, JSON.stringify(addStock.json));

const attempts = await Promise.all(
  Array.from({ length: 25 }, () =>
    request("/store/actions", {
      method: "POST",
      token: accessToken,
      body: {
        storeId,
        actionId: randomUUID(),
        type: "RECORD_SALE",
        payload: { itemId: 1, quantity: 1, sellingPrice: 12 },
      },
    }),
  ),
);

const accepted = attempts.filter(result => result.response.ok && result.json.ok);
const rejected = attempts.filter(result => !result.response.ok || !result.json.ok);
assert.equal(accepted.length, 7, `Expected 7 accepted sales, received ${accepted.length}`);
assert.equal(rejected.length, 18, `Expected 18 rejected sales, received ${rejected.length}`);

const snapshot = await request(`/store/state?storeId=${encodeURIComponent(storeId)}`, {
  token: accessToken,
});
assert.equal(snapshot.response.status, 200, JSON.stringify(snapshot.json));
assert.equal(snapshot.json.state.sales.length, 7, "The final store state should contain seven sales");
assert.equal(
  snapshot.json.state.batches.reduce((sum, batch) => sum + batch.qty_remaining, 0),
  0,
  "The final stock quantity should be zero",
);

const invitation = await request("/store/join-token", {
  method: "POST",
  token: accessToken,
  body: { storeId, host: "127.0.0.1", port: 8080 },
});
assert.equal(invitation.response.status, 200, JSON.stringify(invitation.json));
const joinBody = {
  token: invitation.json.payload.token,
  name: "Smoke test seller",
  pin: "2718",
};
const joined = await request("/store/join", { method: "POST", body: joinBody });
assert.equal(joined.response.status, 201, JSON.stringify(joined.json));
assert.equal(joined.json.role, "seller");
const replayedInvite = await request("/store/join", { method: "POST", body: joinBody });
assert.equal(replayedInvite.response.status, 401, "A worker invitation must only be redeemable once");

const sellerSnapshot = await request(
  `/store/state?storeId=${encodeURIComponent(storeId)}`,
  { token: joined.json.accessToken },
);
assert.equal(sellerSnapshot.response.status, 200, JSON.stringify(sellerSnapshot.json));
assert.deepEqual(sellerSnapshot.json.state.sales, [], "Seller snapshots must not include sales history");
assert.doesNotMatch(
  JSON.stringify(sellerSnapshot.json.state),
  /cost_per_unit|cost_at_sale|profit|cogs/i,
  "Seller snapshots must not expose cost or profit fields",
);

const forbiddenRestock = await request("/store/actions", {
  method: "POST",
  token: joined.json.accessToken,
  body: {
    storeId,
    actionId: randomUUID(),
    type: "ADD_STOCK",
    payload: { itemId: 1, quantity: 1, totalCost: 3, isNewItem: false },
  },
});
assert.equal(forbiddenRestock.response.status, 403, "Sellers must not be able to restock");

const promoted = await request("/store/members", {
  method: "PATCH",
  token: accessToken,
  body: { storeId, memberId: joined.json.memberId, role: "owner" },
});
assert.equal(promoted.response.status, 200, JSON.stringify(promoted.json));
const ownerRestock = await request("/store/actions", {
  method: "POST",
  token: joined.json.accessToken,
  body: {
    storeId,
    actionId: randomUUID(),
    type: "ADD_STOCK",
    payload: { itemId: 1, quantity: 1, totalCost: 3, isNewItem: false },
  },
});
assert.equal(ownerRestock.response.status, 200, JSON.stringify(ownerRestock.json));

const demoted = await request("/store/members", {
  method: "PATCH",
  token: accessToken,
  body: { storeId, memberId: joined.json.memberId, role: "seller" },
});
assert.equal(demoted.response.status, 200, JSON.stringify(demoted.json));
const removed = await request(
  `/store/members/${encodeURIComponent(joined.json.memberId)}?storeId=${encodeURIComponent(storeId)}`,
  { method: "DELETE", token: accessToken },
);
assert.equal(removed.response.status, 204, JSON.stringify(removed.json));
const revokedSnapshot = await request(
  `/store/state?storeId=${encodeURIComponent(storeId)}`,
  { token: joined.json.accessToken },
);
assert.equal(revokedSnapshot.response.status, 401, "Removing a member must revoke their token");

console.log(JSON.stringify({
  passed: true,
  storeId,
  acceptedSales: accepted.length,
  rejectedOversellAttempts: rejected.length,
  invitationSingleUse: true,
  sellerDataRedacted: true,
  sellerRestockBlocked: true,
  roleChangeAndTokenRevocation: true,
  remainingStock: 0,
}, null, 2));
