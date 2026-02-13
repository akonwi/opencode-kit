import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface KitConfig {
  bells: {
    enabled: boolean;
    errorSound: "Funk";
  };
  speech: {
    enabled: boolean;
    maxChars: number;
    voice: string | null;
  };
  debug: {
    toasts: boolean;
    logLevel: LogLevel;
  };
}

export const CONFIG_PATH = path.join(homedir(), ".config", "opencode", "kit.json");

const VALID_LOG_LEVELS: ReadonlySet<string> = new Set(["debug", "info", "warn", "error"]);

const DEFAULT_CONFIG: KitConfig = {
  bells: {
    enabled: true,
    errorSound: "Funk",
  },
  speech: {
    enabled: true,
    maxChars: 220,
    voice: null,
  },
  debug: {
    toasts: true,
    logLevel: "info",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asErrorSound(value: unknown, fallback: "Funk"): "Funk" {
  return value === "Funk" ? "Funk" : fallback;
}

function asOptionalString(value: unknown, fallback: string | null): string | null {
  if (value === null) {
    return null;
  }

  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function asIntInRange(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fallback;
  }

  if (value < min || value > max) {
    return fallback;
  }

  return value;
}

function asLogLevel(value: unknown, fallback: LogLevel): LogLevel {
  if (typeof value !== "string") {
    return fallback;
  }

  return VALID_LOG_LEVELS.has(value) ? (value as LogLevel) : fallback;
}

export function sanitizeConfig(input: unknown): KitConfig {
  const raw = isRecord(input) ? input : {};
  const rawBells = isRecord(raw.bells) ? raw.bells : {};
  const rawSpeech = isRecord(raw.speech) ? raw.speech : {};
  const rawDebug = isRecord(raw.debug) ? raw.debug : {};

  return {
    bells: {
      enabled: asBoolean(rawBells.enabled, DEFAULT_CONFIG.bells.enabled),
      errorSound: asErrorSound(rawBells.errorSound, DEFAULT_CONFIG.bells.errorSound),
    },
    speech: {
      enabled: asBoolean(rawSpeech.enabled, DEFAULT_CONFIG.speech.enabled),
      maxChars: asIntInRange(rawSpeech.maxChars, DEFAULT_CONFIG.speech.maxChars, 20, 2000),
      voice: asOptionalString(rawSpeech.voice, DEFAULT_CONFIG.speech.voice),
    },
    debug: {
      toasts: asBoolean(rawDebug.toasts, DEFAULT_CONFIG.debug.toasts),
      logLevel: asLogLevel(rawDebug.logLevel, DEFAULT_CONFIG.debug.logLevel),
    },
  };
}

export async function readConfig(): Promise<KitConfig> {
  try {
    const content = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(content) as unknown;
    return sanitizeConfig(parsed);
  } catch {
    return sanitizeConfig(DEFAULT_CONFIG);
  }
}

async function ensureConfigDirectory(): Promise<void> {
  await mkdir(path.dirname(CONFIG_PATH), { recursive: true });
}

export async function writeConfig(config: KitConfig): Promise<void> {
  const safeConfig = sanitizeConfig(config);
  const serialized = `${JSON.stringify(safeConfig, null, 2)}\n`;
  const tempPath = `${CONFIG_PATH}.tmp`;

  await ensureConfigDirectory();
  await writeFile(tempPath, serialized, "utf8");
  await rename(tempPath, CONFIG_PATH);
}

export async function updateConfig(mutator: (current: KitConfig) => KitConfig): Promise<KitConfig> {
  const current = await readConfig();
  const next = sanitizeConfig(mutator(current));
  await writeConfig(next);
  return next;
}

export function defaultConfig(): KitConfig {
  return sanitizeConfig(DEFAULT_CONFIG);
}
