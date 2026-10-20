import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startTestServer, type TestContext } from "./helpers.js";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await startTestServer();
});
afterAll(() => ctx.stop());
beforeEach(() => ctx.reset());

describe("auth", () => {
  it("creates a user on first login and returns the same user afterwards", async () => {
    const first = await ctx.api.post("/api/auth/login").send({ phone: "+1 (555) 000-1111", name: "Ada" });
    expect(first.status).toBe(200);
    expect(first.body.token).toEqual(expect.any(String));
    expect(first.body.user).toMatchObject({ name: "Ada", phone: "+15550001111" });
    expect(first.body.user.createdAt).toEqual(expect.any(String));

    const second = await ctx.api.post("/api/auth/login").send({ phone: "+15550001111", name: "Different" });
    expect(second.body.user._id).toBe(first.body.user._id);
    expect(second.body.user.name).toBe("Ada");
  });

  it("returns the current user from /auth/me", async () => {
    const login = await ctx.api.post("/api/auth/login").send({ phone: "+15550002222", name: "Grace" });
    const me = await ctx.api.get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body).toEqual(login.body.user);
  });

  it("rejects invalid input with the validation envelope", async () => {
    const res = await ctx.api.post("/api/auth/login").send({ phone: "abc", name: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "phone", message: expect.any(String) }),
        expect.objectContaining({ path: "name", message: expect.any(String) }),
      ]),
    );
  });

  it("returns a validation error for malformed JSON", async () => {
    const res = await ctx.api.post("/api/auth/login").set("Content-Type", "application/json").send("{nope");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("requires a token", async () => {
    const res = await ctx.api.get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("NO_TOKEN");
  });

  it("rejects an invalid token", async () => {
    const res = await ctx.api.get("/api/auth/me").set("Authorization", "Bearer garbage");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_TOKEN");
  });

  it("serves health at the root and a JSON 404 elsewhere", async () => {
    expect((await ctx.api.get("/health")).body).toEqual({ status: "ok" });
    const missing = await ctx.api.get("/api/nope");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });
});
