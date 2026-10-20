import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createUser, startTestServer, type TestContext } from "./helpers.js";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await startTestServer();
});
afterAll(() => ctx.stop());
beforeEach(() => ctx.reset());

describe("user search", () => {
  it("matches by name, case-insensitively, as a bare array without the requester", async () => {
    const me = await createUser(ctx, "Alice Me");
    await createUser(ctx, "Alicia Keys");
    await createUser(ctx, "Bob");

    const res = await ctx.api.get("/api/users/search").query({ q: "ALIC" }).set(me.auth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toEqual({ _id: expect.any(String), name: "Alicia Keys", phone: expect.any(String) });
  });

  it("matches by phone including a leading plus and the client's regex escaping", async () => {
    const me = await createUser(ctx, "Me");
    const target = await createUser(ctx, "Target", "+8801712345678");

    for (const q of ["+88017", "\\+88017", "1712 345", "345678"]) {
      const res = await ctx.api.get("/api/users/search").query({ q }).set(me.auth);
      expect(res.body.map((user: { _id: string }) => user._id)).toEqual([target._id]);
    }
  });

  it("treats regex characters literally and validates q", async () => {
    const me = await createUser(ctx, "Me");
    await createUser(ctx, "Someone");

    const literal = await ctx.api.get("/api/users/search").query({ q: ".*" }).set(me.auth);
    expect(literal.body).toEqual([]);

    const missing = await ctx.api.get("/api/users/search").set(me.auth);
    expect(missing.status).toBe(400);
    expect(missing.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires auth", async () => {
    const res = await ctx.api.get("/api/users/search").query({ q: "a" });
    expect(res.status).toBe(401);
  });
});
