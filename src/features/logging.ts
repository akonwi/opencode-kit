import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import type { LogLevel } from "../config";

const LOG_DIR = path.join(homedir(), ".config", "opencode", "logs");
export const LOG_PATH = path.join(LOG_DIR, "opencode-kit.log");

const LOG_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface LogContext {
  [key: string]: unknown;
}

export interface Logger {
  setLevel: (level: LogLevel) => void;
  debug: (event: string, message: string, context?: LogContext) => void;
  info: (event: string, message: string, context?: LogContext) => void;
  warn: (event: string, message: string, context?: LogContext) => void;
  error: (event: string, message: string, context?: LogContext) => void;
}

interface LogLine {
  timestamp: string;
  level: LogLevel;
  event: string;
  message: string;
  context?: LogContext;
}

function shouldLog(minLevel: LogLevel, level: LogLevel): boolean {
  return LOG_WEIGHT[level] >= LOG_WEIGHT[minLevel];
}

async function appendLogLine(line: LogLine): Promise<void> {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(LOG_PATH, `${JSON.stringify(line)}\n`, "utf8");
  } catch {
    // Best effort logging only.
  }
}

export function createLogger(initialLevel: LogLevel = "info"): Logger {
  let minLevel = initialLevel;

  const write = (level: LogLevel, event: string, message: string, context?: LogContext): void => {
    if (!shouldLog(minLevel, level)) {
      return;
    }

    void appendLogLine({
      timestamp: new Date().toISOString(),
      level,
      event,
      message,
      context,
    });
  };

  return {
    setLevel: (level: LogLevel) => {
      minLevel = level;
    },
    debug: (event, message, context) => {
      write("debug", event, message, context);
    },
    info: (event, message, context) => {
      write("info", event, message, context);
    },
    warn: (event, message, context) => {
      write("warn", event, message, context);
    },
    error: (event, message, context) => {
      write("error", event, message, context);
    },
  };
}
