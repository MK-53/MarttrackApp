import assert from "node:assert/strict";
import { createServer, request as httpRequest } from "node:http";
import test from "node:test";
import { eq } from "drizzle-orm";
import app from "../app";
import { db, briefingsTable } from "@workspace/db";

const baseRequest = {
  provider: "openai",
  userApiKey: "test-key",
  salesTrend: [],
  topSellers: [],
  slowMovers: [],
  stockHealth: [],
  supplierRecommendations: [],
};

const listen = async () => {
  const server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not start");
  return { server, port: address.port };
};

const postBriefing = (port: number, body: unknown) =>
  new Promise<{ status: number; json: Record<string, unknown> }>((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: "127.0.0.1",
        port,
        path: "/api/business-briefing",
        method: "POST",
        headers: { "content-type": "application/json" },
      },
      response => {
        let raw = "";
        response.setEncoding("utf8");
        response.on("data", chunk => { raw += chunk; });
        response.on("end", () => resolve({ status: response.statusCode || 0, json: JSON.parse(raw) }));
      },
    );
    request.on("error", reject);
    request.end(JSON.stringify(body));
  });

test("returns INVALID_REQUEST for malformed briefing data", async () => {
  const { server, port } = await listen();
  try {
    const response = await postBriefing(port, { userApiKey: "test-key" });
    assert.equal(response.status, 400);
    assert.equal(response.json.code, "INVALID_REQUEST");
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("returns MISSING_API_KEY before calling a provider", async () => {
  const { server, port } = await listen();
  try {
    const response = await postBriefing(port, { ...baseRequest, userApiKey: " " });
    assert.equal(response.status, 400);
    assert.equal(response.json.code, "MISSING_API_KEY");
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("maps provider failures to PROVIDER_ERROR", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: { message: "Incorrect API key provided" } }),
  })) as unknown as typeof fetch;
  const { server, port } = await listen();
  try {
    const response = await postBriefing(port, baseRequest);
    assert.equal(response.status, 502);
    assert.equal(response.json.code, "PROVIDER_ERROR");
    assert.match(String(response.json.error), /API key was rejected/);
    assert.doesNotMatch(String(response.json.error), /test-key/);
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("gives a usage-limit message for provider quota failures", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: { message: "quota exceeded" } }),
  })) as unknown as typeof fetch;
  const { server, port } = await listen();
  try {
    const response = await postBriefing(port, baseRequest);
    assert.equal(response.status, 502);
    assert.match(String(response.json.error), /usage limit/);
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test("validates and persists a successful provider response", async () => {
  const summary = `route test ${Date.now()}`;
  const originalFetch = globalThis.fetch;
  let sentRequestBody = "";
  globalThis.fetch = (async (
    _input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => {
    sentRequestBody = String(init?.body || "");
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              summary,
              recommendations: ["Restock the best seller"],
            }),
          },
        }],
      }),
    };
  }) as unknown as typeof fetch;
  const { server, port } = await listen();

  try {
    const response = await postBriefing(port, baseRequest);
    assert.equal(response.status, 200);
    assert.equal(response.json.summary, summary);
    assert.equal(
      sentRequestBody.includes(baseRequest.userApiKey),
      false,
      "AI prompt must never contain the user's API key",
    );

    const saved = await db
      .select()
      .from(briefingsTable)
      .where(eq(briefingsTable.summary, summary));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].provider, "openai");
    assert.equal(
      JSON.stringify(saved[0].requestSnapshot).includes(baseRequest.userApiKey),
      false,
      "requestSnapshot must never contain the user's API key",
    );
  } finally {
    globalThis.fetch = originalFetch;
    await db.delete(briefingsTable).where(eq(briefingsTable.summary, summary));
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});