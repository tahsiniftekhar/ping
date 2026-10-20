import { describe, expect, it } from "vitest";
import { demoResetRefusal, mongoDatabaseName } from "../src/scripts/demo-reset-guard.js";

describe("mongoDatabaseName", () => {
  it.each([
    ["mongodb://mongo:27017/ping", "ping"],
    ["mongodb://user:p%40ss@mongo:27017/ping?authSource=admin", "ping"],
    ["mongodb://a:27017,b:27017/ping?replicaSet=rs0", "ping"],
    ["mongodb+srv://user:pw@cluster.example.net/ping?retryWrites=true", "ping"],
    ["mongodb://mongo:27017/", ""],
    ["mongodb://mongo:27017", ""],
    ["mongodb://mongo:27017?directConnection=true", ""],
    ["postgresql://postgres:5432/ping", ""],
  ])("%s -> %j", (uri, name) => {
    expect(mongoDatabaseName(uri)).toBe(name);
  });
});

describe("demoResetRefusal", () => {
  const demo = "mongodb://mongo:27017/ping";

  it("refuses unless DEMO_RESET_ALLOWED is exactly true", () => {
    for (const allowed of [undefined, "", "false", "1", "TRUE"]) {
      expect(demoResetRefusal({ DEMO_RESET_ALLOWED: allowed, MONGODB_URI: demo })).toMatch(
        /DEMO_RESET_ALLOWED/,
      );
    }
  });

  it("refuses databases outside the allowlist", () => {
    for (const uri of [
      "mongodb://mongo:27017/other_app",
      "mongodb://mongo:27017/ping-prod",
      "mongodb://mongo:27017",
      undefined,
    ]) {
      expect(demoResetRefusal({ DEMO_RESET_ALLOWED: "true", MONGODB_URI: uri })).toMatch(
        /allowed: ping/,
      );
    }
  });

  it("allows the demo database", () => {
    expect(demoResetRefusal({ DEMO_RESET_ALLOWED: "true", MONGODB_URI: demo })).toBeNull();
  });
});
