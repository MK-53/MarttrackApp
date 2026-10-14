import {
  addRemoteStore,
  setStoreAccessToken,
} from "./stores.js";

const parseJsonResponse = async response => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `Store request failed (${response.status})`);
  }
  return body;
};

export const normalizeServerUrl = value => {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("Enter the PC host address");
  const candidate = /^[a-z]+:\/\//i.test(raw)
    ? raw
    : `http://${raw}`;
  let url;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a valid host address, such as http://192.168.1.20:8080");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Store hosts must use HTTP or HTTPS");
  }
  if (url.protocol === "http:" && !url.port) url.port = "8080";
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
};

const storeRequest = async (serverUrl, path, { token, method = "GET", body } = {}) => {
  const normalizedUrl = normalizeServerUrl(serverUrl);
  const response = await fetch(`${normalizedUrl}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return parseJsonResponse(response);
};

export const createPcStore = async (serverUrl, { name, ownerName, pin }) =>
  storeRequest(serverUrl, "/store", {
    method: "POST",
    body: { name, ownerName, pin },
  });

export const createJoinToken = async (store, token) => {
  const serverUrl = normalizeServerUrl(store.serverUrl);
  const url = new URL(serverUrl);
  const host = url.hostname;
  const port = Number(url.port || (url.protocol === "https:" ? 443 : 8080));
  return storeRequest(serverUrl, "/store/join-token", {
    method: "POST",
    token,
    body: { storeId: store.id, host, port },
  });
};

export const joinPcStore = async (pairing, { name, pin }) => {
  if (
    !pairing ||
    typeof pairing.host !== "string" ||
    typeof pairing.store !== "string" ||
    typeof pairing.token !== "string"
  ) {
    throw new Error("This QR code is not a valid MartTrack store invitation");
  }

  const hostText = pairing.host.trim();
  const serverUrl = /^[a-z]+:\/\//i.test(hostText)
    ? normalizeServerUrl(hostText)
    : normalizeServerUrl(`http://${hostText}:${Number(pairing.port || 8080)}`);
  const joined = await storeRequest(serverUrl, "/store/join", {
    method: "POST",
    body: { token: pairing.token, name, pin },
  });

  const store = {
    id: joined.storeId,
    name: joined.storeName,
    role: joined.role,
    location: "pc",
    serverUrl,
    memberId: joined.memberId,
    createdAt: new Date().toISOString(),
  };
  await addRemoteStore(store);
  await setStoreAccessToken(store.id, joined.accessToken);
  return store;
};

export const fetchStoreSnapshot = (store, token, since = -1) => {
  const query = new URLSearchParams({
    storeId: store.id,
    since: String(since),
  });
  return storeRequest(store.serverUrl, `/store/state?${query.toString()}`, { token });
};

export const sendStoreAction = (store, token, action) =>
  storeRequest(store.serverUrl, "/store/actions", {
    method: "POST",
    token,
    body: { storeId: store.id, ...action },
  });

export const fetchStoreMembers = (store, token) => {
  const query = new URLSearchParams({ storeId: store.id });
  return storeRequest(store.serverUrl, `/store/members?${query.toString()}`, { token });
};

export const changeStoreMemberRole = (store, token, memberId, role) =>
  storeRequest(store.serverUrl, "/store/members", {
    method: "PATCH",
    token,
    body: { storeId: store.id, memberId, role },
  });

export const removeStoreMember = (store, token, memberId) => {
  const query = new URLSearchParams({ storeId: store.id });
  return storeRequest(
    store.serverUrl,
    `/store/members/${encodeURIComponent(memberId)}?${query.toString()}`,
    { method: "DELETE", token },
  );
};

export const storeFromPairingHost = pairing => {
  const host = typeof pairing?.host === "string" ? pairing.host.trim() : "";
  const port = Number(pairing?.port || 8080);
  return host
    ? (/^[a-z]+:\/\//i.test(host) ? normalizeServerUrl(host) : normalizeServerUrl(`http://${host}:${port}`))
    : "";
};
