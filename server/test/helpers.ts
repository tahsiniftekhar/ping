import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { io as connect, type Socket } from "socket.io-client";
import request from "supertest";
import type { Server as IoServer } from "socket.io";
import { createApp } from "../src/app.js";
import { Conversation } from "../src/modules/conversations/conversation.model.js";
import { Message } from "../src/modules/messages/message.model.js";
import { User } from "../src/modules/users/user.model.js";
import { createSocketServer } from "../src/realtime/socket.js";

export interface TestContext {
  api: ReturnType<typeof request>;
  url: string;
  reset(): Promise<void>;
  stop(): Promise<void>;
}

export async function startTestServer(): Promise<TestContext> {
  const mongo = await MongoMemoryServer.create();
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(), Conversation.init(), Message.init()]);

  const httpServer: Server = createServer(createApp({ rateLimit: false }));
  const io: IoServer = createSocketServer(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;

  return {
    api: request(url),
    url,
    async reset() {
      await Promise.all([User.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})]);
    },
    async stop() {
      await io.close();
      await mongoose.disconnect();
      await mongo.stop();
    },
  };
}

export interface TestUser {
  _id: string;
  token: string;
  auth: { Authorization: string };
}

let counter = 0;

export async function createUser(ctx: TestContext, name: string, phone?: string): Promise<TestUser> {
  counter += 1;
  const res = await ctx.api
    .post("/api/auth/login")
    .send({ name, phone: phone ?? `+1555000${String(counter).padStart(4, "0")}` });
  return { _id: res.body.user._id, token: res.body.token, auth: { Authorization: `Bearer ${res.body.token}` } };
}

export async function createGroup(ctx: TestContext, owner: TestUser, members: TestUser[], name = "Team") {
  const res = await ctx.api
    .post("/api/conversations/group")
    .set(owner.auth)
    .send({ name, participantIds: members.map((member) => member._id) });
  return res.body as { _id: string };
}

export async function createDirect(ctx: TestContext, me: TestUser, other: TestUser) {
  const res = await ctx.api.post("/api/conversations").set(me.auth).send({ userId: other._id });
  return res.body as { _id: string };
}

export function connectSocket(ctx: TestContext, token: string): Promise<Socket> {
  const socket = connect(ctx.url, { auth: { token }, transports: ["websocket"], reconnection: false });
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", reject);
  });
}

export function nextEvent<T>(socket: Socket, event: string, timeoutMs = 2000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), timeoutMs);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
