import type { SseEvent } from "@agent-hub/shared";

type Listener = (event: SseEvent) => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emit(event: SseEvent): void {
  for (const listener of listeners) {
    try { listener(event); } catch { /* ignore listener errors */ }
  }
}

export function scanProgress(scanner: string, found: number, total: number): void {
  emit({ type: "scan:progress", scanner, found, total });
}

export function scanComplete(scanner: string, discovered: number, warnings: number): void {
  emit({ type: "scan:complete", scanner, discovered, warnings });
}

export function healthResult(mcpId: string, status: string, latencyMs: number): void {
  emit({ type: "health:result", mcpId, status, latencyMs });
}

export function healthError(mcpId: string, error: string): void {
  emit({ type: "health:error", mcpId, error });
}
