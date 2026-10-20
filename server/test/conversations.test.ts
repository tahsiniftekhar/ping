import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createDirect, createGroup, createUser, startTestServer, type TestContext } from "./helpers.js";

let ctx: TestContext;
beforeAll(async () => {
  ctx = await startTestServer();
});
afterAll(() => ctx.stop());
beforeEach(() => ctx.reset());

describe("direct conversations", () => {
  it("is idempotent for a pair regardless of who opens it", async () => {
    const a = await createUser(ctx, "A");
    const b = await createUser(ctx, "B");

    const first = await ctx.api.post("/api/conversations").set(a.auth).send({ userId: b._id });
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ _id: expect.any(String), participants: [a._id, b._id], createdAt: expect.any(String) });

    const again = await ctx.api.post("/api/conversations").set(b.auth).send({ userId: a._id });
    expect(again.body._id).toBe(first.body._id);

    const racing = await Promise.all([a, b, a, b].map((u, i) =>
      ctx.api.post("/api/conversations").set(u.auth).send({ userId: i % 2 ? a._id : b._id }),
    ));
    expect(new Set(racing.map((res) => res.body._id))).toEqual(new Set([first.body._id]));
  });

  it("rejects self, unknown users and malformed ids", async () => {
    const a = await createUser(ctx, "A");
    expect((await ctx.api.post("/api/conversations").set(a.auth).send({ userId: a._id })).status).toBe(400);
    expect((await ctx.api.post("/api/conversations").set(a.auth).send({ userId: "0".repeat(24) })).status).toBe(404);
    expect((await ctx.api.post("/api/conversations").set(a.auth).send({ userId: "nope" })).status).toBe(400);
  });
});

describe("conversation list", () => {
  it("returns direct and group shapes, newest activity first", async () => {
    const a = await createUser(ctx, "A");
    const b = await createUser(ctx, "B");
    const c = await createUser(ctx, "C");
    const direct = await createDirect(ctx, a, b);
    const group = await createGroup(ctx, a, [b, c], "Trio");

    const res = await ctx.api.get("/api/conversations").set(a.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.map((item: { _id: string }) => item._id)).toEqual([group._id, direct._id]);

    const [groupItem, directItem] = res.body.data;
    expect(directItem).toEqual({
      _id: direct._id,
      type: "direct",
      lastMessage: {},
      updatedAt: expect.any(String),
      participant: { _id: b._id, name: "B", phone: expect.any(String) },
    });
    expect(groupItem).toMatchObject({ type: "group", name: "Trio", createdBy: a._id, admins: [a._id], lastMessage: {} });
    expect(groupItem.participants).toHaveLength(3);

    await ctx.api.post("/api/messages").set(b.auth).send({ conversationId: direct._id, text: "hi" });
    const after = await ctx.api.get("/api/conversations").set(a.auth);
    expect(after.body.data[0]._id).toBe(direct._id);
    expect(after.body.data[0].lastMessage).toEqual({ text: "hi", sender: b._id, createdAt: expect.any(String) });
  });

  it("only lists conversations the user is in", async () => {
    const a = await createUser(ctx, "A");
    const b = await createUser(ctx, "B");
    const outsider = await createUser(ctx, "O");
    await createDirect(ctx, a, b);
    const res = await ctx.api.get("/api/conversations").set(outsider.auth);
    expect(res.body).toEqual({ data: [] });
  });
});

describe("groups", () => {
  it("enforces minimum size and known users", async () => {
    const a = await createUser(ctx, "A");
    const b = await createUser(ctx, "B");

    const small = await ctx.api.post("/api/conversations/group").set(a.auth).send({ name: "G", participantIds: [b._id, b._id] });
    expect(small.status).toBe(400);
    expect(small.body.error).toMatchObject({ code: "VALIDATION_ERROR", message: "a group needs at least 3 members" });

    const unknown = await ctx.api
      .post("/api/conversations/group")
      .set(a.auth)
      .send({ name: "G", participantIds: [b._id, "1".repeat(24)] });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.code).toBe("UNKNOWN_USER");
  });

  it("creates with the creator as sole admin", async () => {
    const [a, b, c] = [await createUser(ctx, "A"), await createUser(ctx, "B"), await createUser(ctx, "C")];
    const res = await ctx.api.post("/api/conversations/group").set(a.auth).send({ name: " Crew ", participantIds: [b._id, c._id] });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ type: "group", name: "Crew", admins: [a._id], createdBy: a._id, lastMessage: {} });
    expect(res.body.createdAt).toEqual(expect.any(String));
  });

  it("restricts rename, add and promote to admins", async () => {
    const [a, b, c, d] = [await createUser(ctx, "A"), await createUser(ctx, "B"), await createUser(ctx, "C"), await createUser(ctx, "D")];
    const group = await createGroup(ctx, a, [b, c]);
    const url = `/api/conversations/${group._id}`;

    const rename = await ctx.api.patch(url).set(b.auth).send({ name: "X" });
    expect(rename.status).toBe(403);
    expect(rename.body.error).toMatchObject({ code: "FORBIDDEN", message: "Only admins can rename the group" });
    expect((await ctx.api.post(`${url}/participants`).set(b.auth).send({ userIds: [d._id] })).status).toBe(403);
    expect((await ctx.api.post(`${url}/admins`).set(b.auth).send({ userId: c._id })).status).toBe(403);
    expect((await ctx.api.delete(`${url}/participants/${c._id}`).set(b.auth)).body.error.code).toBe("FORBIDDEN");

    const renamed = await ctx.api.patch(url).set(a.auth).send({ name: "New" });
    expect(renamed.body.name).toBe("New");

    const added = await ctx.api.post(`${url}/participants`).set(a.auth).send({ userIds: [d._id, b._id] });
    expect(added.status).toBe(200);
    expect(added.body.participants).toHaveLength(4);

    const promoted = await ctx.api.post(`${url}/admins`).set(a.auth).send({ userId: b._id });
    expect(promoted.body.admins).toEqual([a._id, b._id]);
    const again = await ctx.api.post(`${url}/admins`).set(a.auth).send({ userId: b._id });
    expect(again.body.admins).toEqual([a._id, b._id]);

    const stranger = await createUser(ctx, "S");
    expect((await ctx.api.post(`${url}/admins`).set(a.auth).send({ userId: stranger._id })).status).toBe(400);
    expect((await ctx.api.post(`${url}/participants`).set(a.auth).send({ userIds: ["2".repeat(24)] })).body.error.code).toBe("UNKNOWN_USER");
  });

  it("hands admin to the earliest remaining member when the last admin leaves", async () => {
    const [a, b, c] = [await createUser(ctx, "A"), await createUser(ctx, "B"), await createUser(ctx, "C")];
    const group = await createGroup(ctx, a, [b, c]);

    const left = await ctx.api.delete(`/api/conversations/${group._id}/participants/${a._id}`).set(a.auth);
    expect(left.status).toBe(200);
    expect(left.body.admins).toEqual([b._id]);
    expect(left.body.participants.map((p: { _id: string }) => p._id)).toEqual([b._id, c._id]);

    expect((await ctx.api.get("/api/conversations").set(a.auth)).body.data).toEqual([]);
    const removed = await ctx.api.delete(`/api/conversations/${group._id}/participants/${c._id}`).set(b.auth);
    expect(removed.body.participants).toHaveLength(1);
  });

  it("deletes the group when the last member leaves", async () => {
    const [a, b, c] = [await createUser(ctx, "A"), await createUser(ctx, "B"), await createUser(ctx, "C")];
    const group = await createGroup(ctx, a, [b, c]);
    await ctx.api.post("/api/messages").set(a.auth).send({ conversationId: group._id, text: "hello" });

    for (const user of [b, c]) await ctx.api.delete(`/api/conversations/${group._id}/participants/${user._id}`).set(a.auth);
    const last = await ctx.api.delete(`/api/conversations/${group._id}/participants/${a._id}`).set(a.auth);
    expect(last.status).toBe(200);
    expect(last.body.participants).toEqual([]);
    expect((await ctx.api.get(`/api/conversations/${group._id}/messages`).set(a.auth)).status).toBe(404);
  });

  it("rejects group actions on direct chats and hides groups from non-members", async () => {
    const [a, b, c] = [await createUser(ctx, "A"), await createUser(ctx, "B"), await createUser(ctx, "C")];
    const direct = await createDirect(ctx, a, b);
    const rename = await ctx.api.patch(`/api/conversations/${direct._id}`).set(a.auth).send({ name: "x" });
    expect(rename.status).toBe(400);
    expect(rename.body.error.code).toBe("VALIDATION_ERROR");

    const group = await createGroup(ctx, a, [b, c]);
    const outsider = await createUser(ctx, "O");
    expect((await ctx.api.patch(`/api/conversations/${group._id}`).set(outsider.auth).send({ name: "x" })).status).toBe(404);
  });
});
