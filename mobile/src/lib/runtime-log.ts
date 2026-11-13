type LogFields = Record<string, string | number | boolean>;

export function logRuntime(level: "info" | "warn", event: string, fields: LogFields = {}) {
  const entry = JSON.stringify({ event, ...fields });
  if (level === "warn") console.warn(`[space-sync] ${entry}`);
  else console.info(`[space-sync] ${entry}`);
}
