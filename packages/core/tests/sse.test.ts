import { describe, it, expect, beforeEach } from "vitest";
import { subscribe, emit, scanProgress, scanComplete, healthResult, healthError } from "../src/events/sse.js";

describe("SSE events", () => {
  // Reset listeners between tests by re-importing the module essentially,
  // but since it's a singleton, we just ensure we unsubscribe properly
  const received: unknown[] = [];

  beforeEach(() => {
    received.length = 0;
  });

  it("delivers events to subscribed listeners", () => {
    const unsub = subscribe((e) => received.push(e));
    scanProgress("full", 5, 10);
    unsub();

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ type: "scan:progress", scanner: "full", found: 5, total: 10 });
  });

  it("delivers scan:complete events", () => {
    const unsub = subscribe((e) => received.push(e));
    scanComplete("full", 10, 2);
    unsub();

    expect(received[0]).toEqual({ type: "scan:complete", scanner: "full", discovered: 10, warnings: 2 });
  });

  it("delivers health:result events", () => {
    const unsub = subscribe((e) => received.push(e));
    healthResult("mcp_1", "healthy", 42);
    unsub();

    expect(received[0]).toEqual({ type: "health:result", mcpId: "mcp_1", status: "healthy", latencyMs: 42 });
  });

  it("delivers health:error events", () => {
    const unsub = subscribe((e) => received.push(e));
    healthError("mcp_1", "timeout");
    unsub();

    expect(received[0]).toEqual({ type: "health:error", mcpId: "mcp_1", error: "timeout" });
  });

  it("delivers to multiple listeners", () => {
    const r1: unknown[] = [];
    const r2: unknown[] = [];
    const u1 = subscribe((e) => r1.push(e));
    const u2 = subscribe((e) => r2.push(e));

    scanProgress("test", 1, 5);

    expect(r1).toHaveLength(1);
    expect(r2).toHaveLength(1);

    u1();
    u2();
  });

  it("does not deliver after unsubscribe", () => {
    const unsub = subscribe((e) => received.push(e));
    unsub();
    scanProgress("test", 1, 1);
    expect(received).toHaveLength(0);
  });

  it("isolates listener errors", () => {
    const unsubBad = subscribe(() => { throw new Error("listener error"); });
    const unsubGood = subscribe((e) => received.push(e));

    // This should not throw
    scanProgress("test", 1, 1);

    expect(received).toHaveLength(1);

    unsubBad();
    unsubGood();
  });

  it("raw emit works with any event type", () => {
    const unsub = subscribe((e) => received.push(e));
    emit({ type: "db:change", table: "agents", action: "insert", id: "a1" });
    unsub();
    expect(received).toEqual([{ type: "db:change", table: "agents", action: "insert", id: "a1" }]);
  });
});
