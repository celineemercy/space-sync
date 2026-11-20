type LogFields = Record<string, string | number | boolean>;
type LogEntry = { level: "info" | "warn" | "error"; event: string; fields: LogFields };
let sink: ((entry: LogEntry) => void) | null = null;

export function setRuntimeLogSink(next: typeof sink) { sink = next; }

export function logRuntime(level: LogEntry["level"], event: string, fields: LogFields = {}) {
  sink?.({ level, event, fields });
  if (!__DEV__) return;
  const entry = JSON.stringify({ event, ...fields });
  if (level === "error") console.error(`[space-sync] ${entry}`);
  else if (level === "warn") console.warn(`[space-sync] ${entry}`);
  else console.info(`[space-sync] ${entry}`);
}
