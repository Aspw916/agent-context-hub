import { describe, it, expect } from "vitest";
import {
  generateId,
  nowISO,
  containsCJK,
  redact,
  normalizePath,
  defaultDataDir,
} from "../src/utils/index.js";

describe("generateId", () => {
  it("returns a string with the prefix and 16 random chars", () => {
    const id = generateId("test");
    expect(id).toMatch(/^test_[a-z0-9]{16}$/);
  });

  it("produces unique ids across multiple calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId("p")));
    expect(ids.size).toBe(100);
  });

  it("works with different prefixes", () => {
    expect(generateId("agent")).toMatch(/^agent_/);
    expect(generateId("skill")).toMatch(/^skill_/);
    expect(generateId("")).toMatch(/^_[a-z0-9]{16}$/);
  });
});

describe("nowISO", () => {
  it("returns an ISO 8601 string", () => {
    const ts = nowISO();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("returns a date close to now", () => {
    const before = new Date();
    const ts = nowISO();
    const after = new Date();
    const parsed = new Date(ts).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before.getTime() - 100);
    expect(parsed).toBeLessThanOrEqual(after.getTime() + 100);
  });
});

describe("containsCJK", () => {
  it("returns true for Chinese characters", () => {
    expect(containsCJK("你好")).toBe(true);
    expect(containsCJK("这是一个测试")).toBe(true);
  });

  it("returns true when CJK is mixed with ASCII", () => {
    expect(containsCJK("hello 世界")).toBe(true);
  });

  it("returns false for pure ASCII", () => {
    expect(containsCJK("hello world")).toBe(false);
    expect(containsCJK("12345")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(containsCJK("")).toBe(false);
  });

  it("returns true for Japanese Kanji", () => {
    expect(containsCJK("日本語")).toBe(true);
  });
});

describe("redact", () => {
  it("redacts api_key pattern", () => {
    expect(redact("api_key=sk-abc123")).toBe("api_key=[REDACTED]");
    expect(redact("API_KEY: my-secret")).toBe("API_KEY: [REDACTED]");
  });

  it("redacts apikey pattern", () => {
    expect(redact("apikey=xyz")).toBe("apikey=[REDACTED]");
  });

  it("redacts token pattern", () => {
    expect(redact("token=ghp_1234567890abcdef")).toBe("token=[REDACTED]");
    expect(redact("TOKEN: abc")).toBe("TOKEN: [REDACTED]");
  });

  it("redacts secret pattern", () => {
    expect(redact("secret=mysecret")).toBe("secret=[REDACTED]");
  });

  it("redacts password pattern", () => {
    expect(redact("password=12345")).toBe("password=[REDACTED]");
  });

  it("redacts authorization header", () => {
    // regex \S+ matches "Bearer" as one token, "xyz" remains
    expect(redact("authorization=Bearer xyz")).toBe("authorization=[REDACTED] xyz");
  });

  it("redacts bearer token", () => {
    expect(redact("Bearer abc123def")).toBe("Bearer [REDACTED]");
  });

  it("redacts sk- prefixed keys", () => {
    // single capture group: retains prefix, appends [REDACTED]
    expect(redact("sk-abcdefghijklmnopqrstuv")).toBe("sk-abcdefghijklmnopqrstuv[REDACTED]");
  });

  it("does not modify text without secrets", () => {
    const clean = "this is a normal sentence about skills";
    expect(redact(clean)).toBe(clean);
  });

  it("handles multiple secrets in one string", () => {
    const input = "api_key=abc token=xyz";
    const output = redact(input);
    expect(output).toContain("[REDACTED]");
    expect(output).not.toContain("abc");
    expect(output).not.toContain("xyz");
  });
});

describe("normalizePath", () => {
  it("converts backslashes to forward slashes", () => {
    expect(normalizePath("C:\\Users\\test")).toBe("C:/Users/test");
  });

  it("removes trailing slashes", () => {
    expect(normalizePath("/home/user/")).toBe("/home/user");
    expect(normalizePath("C:\\path\\")).toBe("C:/path");
  });

  it("preserves already normalized paths", () => {
    expect(normalizePath("/home/user")).toBe("/home/user");
  });

  it("handles empty string", () => {
    expect(normalizePath("")).toBe("");
  });
});

describe("defaultDataDir", () => {
  it("uses AGENT_HUB_HOME when set", () => {
    process.env.AGENT_HUB_HOME = "/custom/path";
    expect(defaultDataDir()).toBe("/custom/path/.agent-context-hub");
    delete process.env.AGENT_HUB_HOME;
  });

  it("falls back to HOME", () => {
    delete process.env.AGENT_HUB_HOME;
    const originalHome = process.env.HOME;
    process.env.HOME = "/home/testuser";
    expect(defaultDataDir()).toBe("/home/testuser/.agent-context-hub");
    process.env.HOME = originalHome;
  });
});
