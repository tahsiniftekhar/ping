import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDirect, createUser, startTestServer, type TestContext } from "./helpers.js";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await startTestServer();
});
afterAll(() => ctx.stop());
beforeEach(() => ctx.reset());

describe("messages", () => {
  it("sends over REST and paginates newest-first with a before cursor", async () => {
    const a = await createUser(ctx, "A");
    const b = await createUser(ctx, "B");
    const { _id: conversationId } = await createDirect(ctx, a, b);

    for (let i = 1; i <= 5; i++) {
      const sent = await ctx.api.post("/api/messages").set(a.auth).send({ conversationId, text: `m${i}` });
      expect(sent.status).toBe(200);
      expect(sent.body).toEqual({
        _id: expect.any(String),
        conversation: conversationId,
        sender: a._id,
        text: `m${i}`,
        createdAt: expect.any(String),
        seq: i,
      });
    }

    const page1 = await ctx.api.get(`/api/conversations/${conversationId}/messages`).query({ limit: 2 }).set(b.auth);
    expect(page1.body.messages.map((m: { text: string }) => m.text)).toEqual(["m5", "m4"]);
    expect(page1.body.hasMore).toBe(true);

    const cursor = page1.body.messages[1]._id;
    const page2 = await ctx.api.get(`/api/conversations/${conversationId}/messages`).query({ limit: 2, before: cursor }).set(b.auth);
    expect(page2.body.messages.map((m: { text: string }) => m.text)).toEqual(["m3", "m2"]);
    expect(page2.body.hasMore).toBe(true);

    const page3 = await ctx.api
      .get(`/api/conversations/${conversationId}/messages`)
      .query({ limit: 2, before: page2.body.messages[1]._id })
      .set(b.auth);
    expect(page3.body.messages.map((m: { text: string }) => m.text)).toEqual(["m1"]);
    expect(page3.body.hasMore).toBe(false);

    const all = await ctx.api.get(`/api/conversations/${conversationId}/messages`).set(a.auth);
    expect(all.body.messages).toHaveLength(5);
    expect(all.body.hasMore).toBe(false);
  });

  it("returns 404 to non-participants and for unknown conversations", async () => {
    const a = await createUser(ctx, "A");
    const b = await createUser(ctx, "B");
    const outsider = await createUser(ctx, "O");
    const { _id: conversationId } = await createDirect(ctx, a, b);

    const read = await ctx.api.get(`/api/conversations/${conversationId}/messages`).set(outsider.auth);
    expect(read.status).toBe(404);
    expect(read.body.error).toMatchObject({ code: "NOT_FOUND", message: "Conversation not found" });

    const write = await ctx.api.post("/api/messages").set(outsider.auth).send({ conversationId, text: "hi" });
    expect(write.status).toBe(404);

    const unknown = await ctx.api.post("/api/messages").set(a.auth).send({ conversationId: "3".repeat(24), text: "hi" });
    expect(unknown.status).toBe(404);
  });

  it("returns 400, never 500, for malformed ids and bad input", async () => {
    const a = await createUser(ctx, "A");
    const bad = await ctx.api.get("/api/conversations/not-an-id/messages").set(a.auth);
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");

    const badCursor = await ctx.api.get(`/api/conversations/${"4".repeat(24)}/messages`).query({ before: "x" }).set(a.auth);
    expect(badCursor.status).toBe(400);
    const badLimit = await ctx.api.get(`/api/conversations/${"4".repeat(24)}/messages`).query({ limit: 1000 }).set(a.auth);
    expect(badLimit.status).toBe(400);

    const badText = await ctx.api.post("/api/messages").set(a.auth).send({ conversationId: "4".repeat(24), text: "   " });
    expect(badText.status).toBe(400);
  });
});
