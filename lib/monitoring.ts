import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

export type AppErrorContext = {
  area: string;
  action: string;
  severity?: "warning" | "error" | "fatal";
  extra?: Record<string, unknown>;
};

function safeExtra(extra?: Record<string, unknown>) {
  if (!extra) return undefined;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extra)) {
    // Never send credentials, tokens, email addresses, or authorization headers.
    if (/password|token|authorization|cookie|email|phone|secret|key/i.test(key)) continue;
    result[key] = value;
  }
  return result;
}

export function reportAppError(error: unknown, context: AppErrorContext) {
  const normalized = error instanceof Error ? error : new Error(String(error));
  const extra = safeExtra(context.extra);

  console.error("[EYESITE]", {
    area: context.area,
    action: context.action,
    severity: context.severity ?? "error",
    message: normalized.message,
    ...extra,
  });

  Sentry.withScope((scope) => {
    scope.setTag("area", context.area);
    scope.setTag("action", context.action);
    scope.setLevel(context.severity === "warning" ? "warning" : context.severity === "fatal" ? "fatal" : "error");
    if (extra) scope.setExtras(extra);
    Sentry.captureException(normalized);
  });
}

export function addAppBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  category = "app",
) {
  Sentry.addBreadcrumb({
    category,
    message,
    level: "info",
    data: safeExtra(data),
  });
}

export function setAppMonitoringContext() {
  Sentry.setTag("app_version", Constants.expoConfig?.version ?? "unknown");
  Sentry.setTag("runtime_version", String(Constants.expoConfig?.runtimeVersion ?? "unknown"));
  Sentry.setTag("execution_environment", Constants.executionEnvironment);
}
