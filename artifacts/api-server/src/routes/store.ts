import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, storesTable, storeMembersTable } from "@workspace/db";
import { defaultState } from "../../../marttrack/legacy/src/state/martTrackReducer.js";
import { createStoreHost, type StoreHost, type StoreRole } from "../../../marttrack/legacy/src/host/storeHost.js";

const router: IRouter = Router();
const scrypt = promisify(scryptCallback);
const JOIN_TOKEN_TTL_MS = 10 * 60 * 1000;
const joinTokens = new Map<string, { storeId: string; expiresAt: number; host: string; port: number }>();
const hostCache = new Map<string, StoreHost>();
const hostLoads = new Map<string, Promise<StoreHost | null>>();

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const hashPin = async (pin: string) => {
  const salt = randomBytes(16);
  const derived = (await scrypt(pin, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
};

const verifyPin = async (pin: string, encoded: string) => {
  const [saltHex, hashHex] = encoded.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(pin, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const isValidPin = (pin: unknown): pin is string =>
  typeof pin === "string" && /^\d{4,12}$/.test(pin);

const sendServerError = (res: Response, _error: unknown) => {
  return res.status(500).json({ error: "Store service temporarily unavailable" });
};

const getStoreId = (request: Request) => {
  const value =
    (typeof request.query.storeId === "string" && request.query.storeId) ||
    (typeof request.body?.storeId === "string" && request.body.storeId);
  return value || null;
};

const requireMember = async (request: Request, storeId: string) => {
  const authorization = request.header("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const tokenHash = hashToken(match[1]);
  const [member] = await db
    .select()
    .from(storeMembersTable)
    .where(and(eq(storeMembersTable.storeId, storeId), eq(storeMembersTable.tokenHash, tokenHash)))
    .limit(1);
  return member || null;
};

const loadHost = async (storeId: string): Promise<StoreHost | null> => {
  const cached = hostCache.get(storeId);
  if (cached) return cached;
  const inFlight = hostLoads.get(storeId);
  if (inFlight) return inFlight;

  const loading = (async () => {
    const [store] = await db.select().from(storesTable).where(eq(storesTable.id, storeId)).limit(1);
    if (!store) return null;
    const members = await db
      .select()
      .from(storeMembersTable)
      .where(eq(storeMembersTable.storeId, storeId));
    const host = createStoreHost({
      initialState: store.state,
      initialVersion: store.version,
      members: members.map(member => ({ id: member.id, role: member.role as StoreRole })),
      persist: async (state, version) => {
        await db
          .update(storesTable)
          .set({ state, version })
          .where(eq(storesTable.id, storeId));
      },
    });
    hostCache.set(storeId, host);
    return host;
  })();

  hostLoads.set(storeId, loading);
  try {
    return await loading;
  } finally {
    hostLoads.delete(storeId);
  }
};

const requireOwner = async (request: Request, res: Response) => {
  const storeId = getStoreId(request);
  if (!storeId) {
    res.status(400).json({ error: "storeId is required" });
    return null;
  }
  const member = await requireMember(request, storeId);
  if (!member) {
    res.status(401).json({ error: "A valid store access token is required" });
    return null;
  }
  if (member.role !== "owner") {
    res.status(403).json({ error: "Only store owners can manage the team" });
    return null;
  }
  return { storeId, member };
};

router.get("/store/info", async (request, response) => {
  const storeId = getStoreId(request);
  if (!storeId) return response.status(400).json({ error: "storeId is required" });
  try {
    const [store] = await db
      .select({ id: storesTable.id, name: storesTable.name, version: storesTable.version })
      .from(storesTable)
      .where(eq(storesTable.id, storeId))
      .limit(1);
    if (!store) return response.status(404).json({ error: "Store not found" });
    return response.json({ ...store, health: "ok" });
  } catch (error) {
    return sendServerError(response, error);
  }
});

router.post("/store", async (request, response) => {
  const { name, ownerName, pin } = request.body ?? {};
  if (typeof name !== "string" || !name.trim() || name.trim().length > 80) {
    return response.status(400).json({ error: "Store name must be between 1 and 80 characters" });
  }
  if (typeof ownerName !== "string" || !ownerName.trim() || ownerName.trim().length > 80) {
    return response.status(400).json({ error: "Owner name must be between 1 and 80 characters" });
  }
  if (!isValidPin(pin)) return response.status(400).json({ error: "PIN must be 4 to 12 digits" });

  try {
    const storeId = randomUUID();
    const memberId = randomUUID();
    const accessToken = randomBytes(32).toString("base64url");
    const initial = JSON.parse(JSON.stringify(defaultState)) as Record<string, unknown>;
    await db.transaction(async transaction => {
      await transaction.insert(storesTable).values({
        id: storeId,
        name: name.trim(),
        state: initial,
        version: 0,
      });
      await transaction.insert(storeMembersTable).values({
        id: memberId,
        storeId,
        name: ownerName.trim(),
        role: "owner",
        pinHash: await hashPin(pin),
        tokenHash: hashToken(accessToken),
      });
    });
    return response.status(201).json({
      storeId,
      memberId,
      name: name.trim(),
      role: "owner",
      accessToken,
      version: 0,
      state: initial,
    });
  } catch (error) {
    return sendServerError(response, error);
  }
});

router.post("/store/join-token", async (request, response) => {
  const authorization = await requireOwner(request, response);
  if (!authorization) return;
  const host = typeof request.body?.host === "string" ? request.body.host.trim() : "";
  const port = Number(request.body?.port ?? 8080);
  if (!host || host.length > 255 || !Number.isInteger(port) || port < 1 || port > 65535) {
    return response.status(400).json({ error: "A valid host and port are required for the QR code" });
  }

  try {
    const now = Date.now();
    for (const [tokenHash, entry] of joinTokens) {
      if (entry.expiresAt <= now) joinTokens.delete(tokenHash);
    }
    const token = randomBytes(24).toString("base64url");
    joinTokens.set(hashToken(token), {
      storeId: authorization.storeId,
      expiresAt: now + JOIN_TOKEN_TTL_MS,
      host,
      port,
    });
    return response.json({
      payload: { host, port, store: authorization.storeId, token },
      expiresAt: new Date(now + JOIN_TOKEN_TTL_MS).toISOString(),
    });
  } catch (error) {
    return sendServerError(response, error);
  }
});

router.post("/store/join", async (request, response) => {
  const { token, name, pin } = request.body ?? {};
  if (typeof token !== "string" || !token || typeof name !== "string" || !name.trim()) {
    return response.status(400).json({ error: "Join token and member name are required" });
  }
  if (name.trim().length > 80) return response.status(400).json({ error: "Name is too long" });
  if (!isValidPin(pin)) return response.status(400).json({ error: "PIN must be 4 to 12 digits" });

  const tokenHash = hashToken(token);
  const join = joinTokens.get(tokenHash);
  if (!join || join.expiresAt <= Date.now()) {
    joinTokens.delete(tokenHash);
    return response.status(401).json({ error: "Join code is invalid or has expired" });
  }
  // Consume before the first await so simultaneous scans cannot redeem it twice.
  joinTokens.delete(tokenHash);

  try {
    const [store] = await db
      .select({ id: storesTable.id, name: storesTable.name })
      .from(storesTable)
      .where(eq(storesTable.id, join.storeId))
      .limit(1);
    if (!store) return response.status(404).json({ error: "Store not found" });

    const host = await loadHost(join.storeId);
    if (!host) return response.status(404).json({ error: "Store not found" });
    const memberId = randomUUID();
    const accessToken = randomBytes(32).toString("base64url");
    await db.insert(storeMembersTable).values({
      id: memberId,
      storeId: join.storeId,
      name: name.trim(),
      role: "seller",
      pinHash: await hashPin(pin),
      tokenHash: hashToken(accessToken),
    });
    host.addMember({ id: memberId, role: "seller" });
    return response.status(201).json({
      storeId: join.storeId,
      storeName: store.name,
      memberId,
      name: name.trim(),
      role: "seller",
      accessToken,
      host: join.host,
      port: join.port,
    });
  } catch (error) {
    return sendServerError(response, error);
  }
});

router.get("/store/state", async (request, response) => {
  const storeId = getStoreId(request);
  if (!storeId) return response.status(400).json({ error: "storeId is required" });
  try {
    const member = await requireMember(request, storeId);
    if (!member) return response.status(401).json({ error: "A valid store access token is required" });
    const host = await loadHost(storeId);
    if (!host) return response.status(404).json({ error: "Store not found" });
    const since = Number(request.query.since ?? -1);
    if (!Number.isInteger(since)) return response.status(400).json({ error: "since must be an integer" });
    return response.json(host.getSnapshot(member.id, since));
  } catch (error) {
    return sendServerError(response, error);
  }
});

router.post("/store/actions", async (request, response) => {
  const storeId = getStoreId(request);
  const { actionId, type, payload } = request.body ?? {};
  if (!storeId) return response.status(400).json({ error: "storeId is required" });
  if (typeof actionId !== "string" || typeof type !== "string") {
    return response.status(400).json({ error: "actionId and action type are required" });
  }
  try {
    const member = await requireMember(request, storeId);
    if (!member) return response.status(401).json({ error: "A valid store access token is required" });
    const host = await loadHost(storeId);
    if (!host) return response.status(404).json({ error: "Store not found" });
    const result = await host.submitAction({
      memberId: member.id,
      actionId,
      type,
      payload: payload && typeof payload === "object" ? payload : {},
    });
    return response.status(result.ok ? 200 : 403).json(result);
  } catch (error) {
    return sendServerError(response, error);
  }
});

router.get("/store/members", async (request, response) => {
  const authorization = await requireOwner(request, response);
  if (!authorization) return;
  try {
    const members = await db
      .select({
        id: storeMembersTable.id,
        name: storeMembersTable.name,
        role: storeMembersTable.role,
        createdAt: storeMembersTable.createdAt,
      })
      .from(storeMembersTable)
      .where(eq(storeMembersTable.storeId, authorization.storeId));
    return response.json({ members });
  } catch (error) {
    return sendServerError(response, error);
  }
});

router.patch("/store/members", async (request, response) => {
  const authorization = await requireOwner(request, response);
  if (!authorization) return;
  const { memberId, role } = request.body ?? {};
  if (typeof memberId !== "string" || !["owner", "seller"].includes(role)) {
    return response.status(400).json({ error: "memberId and a valid role are required" });
  }
  try {
    const [updated] = await db
      .update(storeMembersTable)
      .set({ role: role as StoreRole })
      .where(and(eq(storeMembersTable.storeId, authorization.storeId), eq(storeMembersTable.id, memberId)))
      .returning({ id: storeMembersTable.id, role: storeMembersTable.role });
    if (!updated) return response.status(404).json({ error: "Store member not found" });
    const host = await loadHost(authorization.storeId);
    host?.updateMember(memberId, { role: updated.role });
    return response.json(updated);
  } catch (error) {
    return sendServerError(response, error);
  }
});

router.delete("/store/members/:memberId", async (request, response) => {
  const authorization = await requireOwner(request, response);
  if (!authorization) return;
  const memberId = request.params.memberId;
  try {
    const [target] = await db
      .select({ id: storeMembersTable.id, role: storeMembersTable.role })
      .from(storeMembersTable)
      .where(and(eq(storeMembersTable.storeId, authorization.storeId), eq(storeMembersTable.id, memberId)))
      .limit(1);
    if (!target) return response.status(404).json({ error: "Store member not found" });
    if (target.role === "owner") {
      const [owners] = await db
        .select({ value: count() })
        .from(storeMembersTable)
        .where(and(eq(storeMembersTable.storeId, authorization.storeId), eq(storeMembersTable.role, "owner")));
      if (Number(owners?.value ?? 0) <= 1) {
        return response.status(409).json({ error: "The last owner cannot be removed" });
      }
    }
    await db
      .delete(storeMembersTable)
      .where(and(eq(storeMembersTable.storeId, authorization.storeId), eq(storeMembersTable.id, memberId)));
    const host = await loadHost(authorization.storeId);
    host?.removeMember(memberId);
    return response.status(204).send();
  } catch (error) {
    return sendServerError(response, error);
  }
});

export default router;
