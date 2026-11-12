type LogFields = Record<string, string | number | boolean>;

export function logRuntime(level: "info" | "warn", event: string, fields: LogFields = {}) {
  const entry = JSON.stringify({ event, ...fields });
  if (level === "warn") console.warn(`[CampusSpace] ${entry}`);
  else console.info(`[CampusSpace] ${entry}`);
}
