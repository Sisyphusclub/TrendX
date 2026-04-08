export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

interface LogPayload extends LogContext {
  level: LogLevel;
  message: string;
  timestamp: string;
}

function serializeLog(payload: LogPayload): string {
  return JSON.stringify(payload);
}

function writeLog(
  level: LogLevel,
  message: string,
  context: LogContext = {},
): void {
  const payload: LogPayload = {
    ...context,
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  const serializedPayload = serializeLog(payload);

  if (level === "error") {
    console.error(serializedPayload);
    return;
  }

  if (level === "warn") {
    console.warn(serializedPayload);
    return;
  }

  if (level === "debug") {
    console.debug(serializedPayload);
    return;
  }

  console.info(serializedPayload);
}

export const logger = {
  debug(message: string, context: LogContext = {}): void {
    writeLog("debug", message, context);
  },
  info(message: string, context: LogContext = {}): void {
    writeLog("info", message, context);
  },
  warn(message: string, context: LogContext = {}): void {
    writeLog("warn", message, context);
  },
  error(message: string, context: LogContext = {}): void {
    writeLog("error", message, context);
  },
};
