import { usePathname } from "expo-router";
import { useEffect } from "react";
import { logRuntime } from "@/lib/runtime-log";

type ErrorHandler = (error: Error, isFatal?: boolean) => void;
type ErrorUtilsApi = { getGlobalHandler: () => ErrorHandler; setGlobalHandler: (handler: ErrorHandler) => void };

export function RuntimeDiagnostics() {
  const pathname = usePathname();

  useEffect(() => {
    // Route templates are enough to reconstruct navigation without logging room IDs.
    const route = pathname.replace(/\/room\/[^/]+/, "/room/:id").replace(/\/admin-request\/[^/]+/, "/admin-request/:id");
    logRuntime("info", "navigation", { route });
  }, [pathname]);

  useEffect(() => {
    const errorUtils = (globalThis as typeof globalThis & { ErrorUtils?: ErrorUtilsApi }).ErrorUtils;
    if (!errorUtils) return;
    const previous = errorUtils.getGlobalHandler();
    const handler: ErrorHandler = (error, isFatal) => {
      logRuntime("error", "uncaught_js_error", { name: error.name, fatal: Boolean(isFatal) });
      previous(error, isFatal);
    };
    errorUtils.setGlobalHandler(handler);
    return () => errorUtils.setGlobalHandler(previous);
  }, []);
  return null;
}
