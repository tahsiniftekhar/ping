import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { io as connect, type Socket } from "socket.io-client";
import {
  connectSocket,
  createDirect,
  createGroup,
  createUser,
  nextEvent,
  sleep,
  startTestServer,
  type TestContext,
} from "./helpers.js";

let ctx: TestContext;
const sockets: Socket[] = [];
const open = async (token: string) => {
  const socket = await connectSocket(ctx, token);
  sockets.push(socket);
  return socket;
};

beforeAll(async () => {
  ctx = await startTestServer();
});
afterAll(() => ctx.stop());
beforeEach(async () => {
  sockets.splice(0).forEach((socket) => socket.close());
  await ctx.reset();
});

const send = (socket: Socket, payload: unknown) =>
  socket.timeout(2000).emitWithAck("message:send", payload) as Promise<{ ok: boolean; error?: string }>;

describe("socket", () => {
  it("rejects an invalid or missing token", async () => {
    for (const auth of [{ token: "bad" }, {}]) {
      const socket = connect(ctx.url, { auth, transports: ["websocket"], reconnection: false });
      const error = await new Promise<Error>((resolve) => socket.once("connect_error", resolve));
      expect(error.message).toBe("Invalid token");
      socket.close();
    }
  });

  it("acks the sender and delivers message:new to others only", async () => {
    const a = await createUser(ctx, "A");
    const b = await createUser(ctx, "B");
    const { _id: conversationId } = await createDirect(ctx, a, b);
    const sa = await open(a.token);
    const sb = await open(b.token);

    let senderGotEcho = false;
    sa.on("message:new", () => (senderGotEcho = true));
    const incoming = nextEvent<Record<string, unknown>>(sb, "message:new");

    expect(await send(sa, { conversationId, text: " hello " })).toEqual({ ok: true });

    const message = await incoming;
    expect(message).toEqual({
      id: expect.any(String),
      conversation: conversationId,
      sender: a._id,
      text: "hello",
      createdAt: expect.any(Number),
    });
    await sleep(150);
    expect(senderGotEcho).toBe(false);

    const history = await ctx.api.get(`/api/conversations/${conversationId}/messages`).set(b.auth);
    expect(history.body.messages[0]._id).toBe(message.id);
    expect(new Date(history.body.messages[0].createdAt).getTime()).toBe(message.createdAt);
  });

  it("emits message:new for REST sends too", async () => {
    const a = await createUser(ctx, "A");
    const b = await createUser(ctx, "B");
    const { _id: conversationId } = await createDirect(ctx, a, b);
    const sb = await open(b.token);
    const incoming = nextEvent<{ text: string }>(sb, "message:new");
    await ctx.api.post("/api/messages").set(a.auth).send({ conversationId, text: "via rest" });
    expect((await incoming).text).toBe("via rest");
  });

  it("returns failure acks and tolerates a missing ack callback", async () => {
    const a = await createUser(ctx, "A");
    const sa = await open(a.token);

    expect(await send(sa, { conversationId: "5".repeat(24), text: "x" })).toEqual({ ok: false, error: "Conversation not found" });
    expect((await send(sa, { conversationId: "bad", text: "x" })).ok).toBe(false);
    expect((await send(sa, null)).ok).toBe(false);

    sa.emit("message:send", { conversationId: "5".repeat(24), text: "x" });
    expect(await send(sa, { conversationId: "5".repeat(24), text: "x" })).toMatchObject({ ok: false });
  });

  it("rate limits a noisy socket", async () => {
    const a = await createUser(ctx, "A");
    const sa = await open(a.token);
    const acks = await Promise.all(Array.from({ length: 22 }, () => send(sa, { conversationId: "5".repeat(24), text: "x" })));
    expect(acks.filter((ack) => ack.error === "Slow down")).toHaveLength(2);
  });

  it("delivers conversation:updated to a removed member and stops their messages", async () => {
    const [a, b, c] = [await createUser(ctx, "A"), await createUser(ctx, "B"), await createUser(ctx, "C")];
    const group = await createGroup(ctx, a, [b, c]);
    const sa = await open(a.token);
    const sb = await open(b.token);
    const sc = await open(c.token);

    const removedEvent = nextEvent<Record<string, unknown>>(sc, "conversation:updated");
    const remainingEvent = nextEvent<Record<string, unknown>>(sb, "conversation:updated");
    await ctx.api.delete(`/api/conversations/${group._id}/participants/${c._id}`).set(a.auth);

    const payload = await removedEvent;
    expect(payload).toMatchObject({ _id: group._id, type: "group", admins: [a._id], createdBy: a._id });
    expect(payload).not.toHaveProperty("lastMessage");
    expect((payload.participants as { _id: string }[]).map((p) => p._id)).toEqual([a._id, b._id]);
    await remainingEvent;

    expect((await send(sc, { conversationId: group._id, text: "still here?" })).ok).toBe(false);

    const gotMessage = nextEvent(sb, "message:new");
    expect(await send(sa, { conversationId: group._id, text: "hi team" })).toEqual({ ok: true });
    await gotMessage;
  });

  it("notifies everyone, including new members, on group creation", async () => {
    const [a, b, c] = [await createUser(ctx, "A"), await createUser(ctx, "B"), await createUser(ctx, "C")];
    const sb = await open(b.token);
    const event = nextEvent<{ name: string }>(sb, "conversation:updated");
    await createGroup(ctx, a, [b, c], "Fresh");
    expect((await event).name).toBe("Fresh");
  });
});
