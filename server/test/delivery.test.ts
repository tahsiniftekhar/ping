import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Types } from "mongoose";
import type { Socket } from "socket.io-client";
import { io as connect } from "socket.io-client";
import { backfillSeq } from "../src/scripts/backfill-seq.js";
import { Conversation } from "../src/modules/conversations/conversation.model.js";
import { Message } from "../src/modules/messages/message.model.js";
import {
  connectSocket,
  createDirect,
  createUser,
  nextEvent,
  sleep,
  startTestServer,
  type TestContext,
  type TestUser,
} from "./helpers.js";

interface MessageJSON {
  _id: string;
  conversation: string;
  sender: string;
  text: string;
  createdAt: string;
  seq: number;
  clientMessageId?: string;
}
type SendAck = { ok: true; message: MessageJSON } | { ok: false; error: string };
type SyncAck = {
  ok: true;
  results: { conversationId: string; messages: MessageJSON[]; complete: boolean }[];
} | { ok: false; error: string };

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
  socket.timeout(5000).emitWithAck("message:send", payload) as Promise<SendAck>;
const sync = (socket: Socket, payload: unknown) =>
  socket.timeout(5000).emitWithAck("messages:sync", payload) as Promise<SyncAck>;

function okMessage(ack: SendAck) {
  if (!ack.ok) throw new Error(ack.error);
  return ack.message;
}

function okResults(ack: SyncAck) {
  if (!ack.ok) throw new Error(ack.error);
  return ack.results;
}

async function pair() {
  const a = await createUser(ctx, "A");
  const b = await createUser(ctx, "B");
  const { _id: conversationId } = await createDirect(ctx, a, b);
  return { a, b, conversationId };
}

async function history(user: TestUser, conversationId: string, query: Record<string, unknown> = {}) {
  return ctx.api.get(`/api/conversations/${conversationId}/messages`).query(query).set(user.auth);
}

async function seedMessages(conversationId: string, sender: string, count: number) {
  await Message.insertMany(
    Array.from({ length: count }, (_, n) => ({ conversation: conversationId, sender, text: `m${n + 1}`, seq: n + 1 })),
  );
  await Conversation.updateOne({ _id: conversationId }, { $set: { lastSeq: count } });
}

describe("handshake", () => {
  it("emits server:hello with the supported features", async () => {
    const a = await createUser(ctx, "A");
    const socket = connect(ctx.url, { auth: { token: a.token }, transports: ["websocket"], reconnection: false });
    sockets.push(socket);
    const hello = await nextEvent(socket, "server:hello");
    expect(hello).toEqual({ protocol: 2, features: ["idempotent-send", "message-seq", "sync"] });
  });
});

describe("idempotent sends", () => {
  it("returns the same message for a repeated socket send and notifies the recipient once", async () => {
    const { a, b, conversationId } = await pair();
    const sa = await open(a.token);
    const sb = await open(b.token);
    const received: unknown[] = [];
    sb.on("message:new", (payload) => received.push(payload));

    const payload = { conversationId, text: "hello", clientMessageId: "client-msg-0001" };
    const first = okMessage(await send(sa, payload));
    const second = okMessage(await send(sa, payload));

    expect(second._id).toBe(first._id);
    expect(second.seq).toBe(first.seq);
    expect(first.clientMessageId).toBe("client-msg-0001");
    expect(await Message.countDocuments({ conversation: conversationId })).toBe(1);
    expect((await Conversation.findById(conversationId))?.lastSeq).toBe(1);
    await sleep(150);
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      id: first._id,
      conversation: conversationId,
      sender: a._id,
      text: "hello",
      createdAt: new Date(first.createdAt).getTime(),
      seq: first.seq,
    });
  });

  it("collapses concurrent identical sends into one message", async () => {
    const { a, conversationId } = await pair();
    const sa = await open(a.token);
    const payload = { conversationId, text: "race", clientMessageId: "client-msg-race" };

    const acks = await Promise.all(Array.from({ length: 5 }, () => send(sa, payload)));
    const messages = acks.map(okMessage);

    expect(new Set(messages.map((m) => m._id)).size).toBe(1);
    expect(await Message.countDocuments({ conversation: conversationId })).toBe(1);
  });

  it("is idempotent over REST and rejects reuse in another conversation", async () => {
    const { a, b, conversationId } = await pair();
    const c = await createUser(ctx, "C");
    const other = await createDirect(ctx, a, c);
    const body = { conversationId, text: "once", clientMessageId: "client-msg-rest" };

    const first = await ctx.api.post("/api/messages").set(a.auth).send(body);
    const second = await ctx.api.post("/api/messages").set(a.auth).send(body);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(first.body).toMatchObject({ seq: 1, clientMessageId: "client-msg-rest" });
    expect(await Message.countDocuments({ conversation: conversationId })).toBe(1);

    const reuse = await ctx.api.post("/api/messages").set(a.auth).send({ ...body, conversationId: other._id });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error).toMatchObject({ code: "VALIDATION_ERROR", message: "clientMessageId already used" });

    const sameIdOtherSender = await ctx.api.post("/api/messages").set(b.auth).send(body);
    expect(sameIdOtherSender.body._id).not.toBe(first.body._id);
  });

  it("validates clientMessageId and omits it when absent", async () => {
    const { a, conversationId } = await pair();
    for (const clientMessageId of ["short", "has space 123", "x".repeat(65), 12345678]) {
      const res = await ctx.api.post("/api/messages").set(a.auth).send({ conversationId, text: "x", clientMessageId });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].path).toBe("clientMessageId");
    }
    const plain = await ctx.api.post("/api/messages").set(a.auth).send({ conversationId, text: "x" });
    expect(plain.body).not.toHaveProperty("clientMessageId");
  });
});

describe("ordering", () => {
  it("assigns unique contiguous seqs to concurrent sends from two users", async () => {
    const { a, b, conversationId } = await pair();
    const sa = await open(a.token);
    const sb = await open(b.token);
    const seenByA: number[] = [];
    const seenByB: number[] = [];
    sa.on("message:new", (m: { seq: number }) => seenByA.push(m.seq));
    sb.on("message:new", (m: { seq: number }) => seenByB.push(m.seq));

    const acks = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        i % 2 === 0 ? send(sa, { conversationId, text: `a${i}` }) : send(sb, { conversationId, text: `b${i}` }),
      ),
    );
    const seqs = acks.map((ack) => okMessage(ack).seq);
    expect(new Set(seqs).size).toBe(20);

    const res = await history(a, conversationId, { limit: 100 });
    const stored = res.body.messages.map((m: MessageJSON) => m.seq);
    expect(stored).toEqual(Array.from({ length: 20 }, (_, i) => 20 - i));
    await sleep(200);
    expect(seenByA.every((seq) => Number.isInteger(seq))).toBe(true);
    expect(seenByA).toHaveLength(10);
    expect(seenByB).toHaveLength(10);
  });
});

describe("messages:sync", () => {
  it("returns messages after the cursor in ascending order", async () => {
    const { a, b, conversationId } = await pair();
    const sa = await open(a.token);
    const sb = await open(b.token);
    const sent: MessageJSON[] = [];
    for (let i = 1; i <= 5; i++) sent.push(okMessage(await send(sa, { conversationId, text: `m${i}` })));

    const [result] = okResults(await sync(sb, { cursors: [{ conversationId, afterSeq: sent[1]!.seq }] }));
    expect(result!.conversationId).toBe(conversationId);
    expect(result!.messages.map((m) => m.text)).toEqual(["m3", "m4", "m5"]);
    expect(result!.messages.map((m) => m.seq)).toEqual([3, 4, 5]);
    expect(result!.complete).toBe(true);
  });

  it("caps a batch at 100 and flags it incomplete", async () => {
    const { a, b, conversationId } = await pair();
    await seedMessages(conversationId, a._id, 150);
    const sb = await open(b.token);

    const [first] = okResults(await sync(sb, { cursors: [{ conversationId, afterSeq: 0 }] }));
    expect(first!.messages).toHaveLength(100);
    expect(first!.messages[99]!.seq).toBe(100);
    expect(first!.complete).toBe(false);

    const [rest] = okResults(await sync(sb, { cursors: [{ conversationId, afterSeq: 100 }] }));
    expect(rest!.messages).toHaveLength(50);
    expect(rest!.complete).toBe(true);
  });

  it("returns an empty incomplete result for non-participants and unknown conversations", async () => {
    const { a, conversationId } = await pair();
    const outsider = await createUser(ctx, "O");
    const sa = await open(a.token);
    await send(sa, { conversationId, text: "secret" });
    const so = await open(outsider.token);
    const unknown = "6".repeat(24);

    const results = okResults(
      await sync(so, { cursors: [{ conversationId, afterSeq: 0 }, { conversationId: unknown, afterSeq: 0 }] }),
    );
    expect(results).toEqual([
      { conversationId, messages: [], complete: false },
      { conversationId: unknown, messages: [], complete: false },
    ]);
  });

  it("rejects invalid payloads, tolerates a missing ack and rate limits", async () => {
    const { a, conversationId } = await pair();
    const sa = await open(a.token);
    for (const bad of [null, {}, { cursors: [{ conversationId: "bad", afterSeq: 0 }] }, { cursors: [{ conversationId, afterSeq: -1 }] }]) {
      expect((await sync(sa, bad)).ok).toBe(false);
    }
    const tooMany = { cursors: Array.from({ length: 101 }, () => ({ conversationId, afterSeq: 0 })) };
    expect((await sync(sa, tooMany)).ok).toBe(false);

    sa.emit("messages:sync", { cursors: [] });
    const acks = await Promise.all(Array.from({ length: 10 }, () => sync(sa, { cursors: [] })));
    expect(acks.filter((ack) => !ack.ok && ack.error === "Slow down").length).toBeGreaterThan(0);
  });

  it("recovers exactly the messages missed during a disconnect", async () => {
    const { a, b, conversationId } = await pair();
    const sa = await open(a.token);
    let sb = await open(b.token);
    let lastSeen = 0;
    sb.on("message:new", (m: { seq: number }) => (lastSeen = m.seq));

    const first = nextEvent(sb, "message:new");
    await send(sa, { conversationId, text: "before" });
    await first;
    expect(lastSeen).toBe(1);

    sb.disconnect();
    for (const text of ["x1", "x2", "x3"]) await send(sa, { conversationId, text });

    sb = await open(b.token);
    const [result] = okResults(await sync(sb, { cursors: [{ conversationId, afterSeq: lastSeen }] }));
    expect(result!.messages.map((m) => m.text)).toEqual(["x1", "x2", "x3"]);
    expect(result!.messages.map((m) => m.seq)).toEqual([2, 3, 4]);
    expect(result!.complete).toBe(true);
  });
});

describe("history pagination", () => {
  it("reports hasMore false for exactly limit messages", async () => {
    const { a, conversationId } = await pair();
    await seedMessages(conversationId, a._id, 3);
    const res = await history(a, conversationId, { limit: 3 });
    expect(res.body.messages).toHaveLength(3);
    expect(res.body.hasMore).toBe(false);
  });

  it("reports hasMore true for limit+1 and false on the next page", async () => {
    const { a, conversationId } = await pair();
    await seedMessages(conversationId, a._id, 4);
    const page1 = await history(a, conversationId, { limit: 3 });
    expect(page1.body.hasMore).toBe(true);
    const page2 = await history(a, conversationId, { limit: 3, before: page1.body.messages[2]._id });
    expect(page2.body.messages.map((m: MessageJSON) => m.seq)).toEqual([1]);
    expect(page2.body.hasMore).toBe(false);
  });

  it("rejects a before cursor from another conversation or an unknown message", async () => {
    const { a, b, conversationId } = await pair();
    const c = await createUser(ctx, "C");
    const other = await createDirect(ctx, a, c);
    const sent = await ctx.api.post("/api/messages").set(a.auth).send({ conversationId: other._id, text: "elsewhere" });

    for (const before of [sent.body._id, "7".repeat(24)]) {
      const res = await history(b, conversationId, { before });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatchObject({ code: "VALIDATION_ERROR", details: [{ path: "before" }] });
    }
  });
});

describe("backfillSeq", () => {
  it("numbers legacy messages in _id order, sets lastSeq and is idempotent", async () => {
    const { a, b, conversationId } = await pair();
    const { _id: second } = await createDirect(ctx, a, await createUser(ctx, "C"));
    // Bypass mongoose defaults so the legacy documents truly have no seq.
    const legacy = (conversation: string, text: string) =>
      Message.collection.insertOne({
        conversation: new Types.ObjectId(conversation),
        sender: new Types.ObjectId(a._id),
        text,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    for (const text of ["l1", "l2", "l3"]) await legacy(conversationId, text);
    await legacy(second, "other");

    expect(await backfillSeq()).toBe(4);

    const read = async () =>
      (await Message.find({ conversation: conversationId }).sort({ _id: 1 }).lean()).map((m) => [m.text, m.seq]);
    expect(await read()).toEqual([["l1", 1], ["l2", 2], ["l3", 3]]);
    expect((await Conversation.findById(conversationId))?.lastSeq).toBe(3);
    expect((await Conversation.findById(second))?.lastSeq).toBe(1);

    expect(await backfillSeq()).toBe(0);
    expect(await read()).toEqual([["l1", 1], ["l2", 2], ["l3", 3]]);

    const sent = await ctx.api.post("/api/messages").set(b.auth).send({ conversationId, text: "new" });
    expect(sent.body.seq).toBe(4);
  });
});
