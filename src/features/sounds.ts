import { spawn } from "node:child_process";

import type { KitConfig } from "../config";
import type { Logger } from "./logging";

const FUNK_SOUND_PATH = "/System/Library/Sounds/Funk.aiff";

function runCommand(command: string, args: string[], logger: Logger): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: "ignore",
    });

    child.on("error", (error) => {
      logger.warn("command.error", "Command failed to launch", {
        command,
        args,
        error: error.message,
      });
      resolve();
    });

    child.on("exit", (code) => {
      if (code !== 0) {
        logger.warn("command.nonzero", "Command exited non-zero", {
          command,
          args,
          code,
        });
      }

      resolve();
    });
  });
}

function truncateSummary(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxChars - 3)}...`;
}

function cleanTextForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " code block omitted ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/[*_~#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortSpeech(text: string, maxChars: number): string {
  const cleaned = cleanTextForSpeech(text);
  if (!cleaned) {
    return "";
  }

  if (cleaned.length <= maxChars) {
    return cleaned;
  }

  const sentence = cleaned.match(/(.+?[.!?])(\s|$)/)?.[1]?.trim();
  if (sentence && sentence.length <= maxChars) {
    return sentence;
  }

  return truncateSummary(cleaned, maxChars);
}

function writeTerminalBell(logger: Logger): void {
  try {
    process.stdout.write("\u0007");
  } catch (error) {
    logger.warn("bell.error", "Failed to write terminal bell", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function speak(text: string, config: KitConfig, logger: Logger): Promise<void> {
  if (!config.speech.enabled) {
    return;
  }

  if (process.platform !== "darwin") {
    logger.info("speech.unsupported", "Speech skipped: platform unsupported", {
      platform: process.platform,
    });
    return;
  }

  const clipped = shortSpeech(text, config.speech.maxChars);
  if (!clipped) {
    return;
  }

  const args: string[] = [];
  if (config.speech.voice) {
    args.push("-v", config.speech.voice);
  }
  args.push(clipped);

  await runCommand("say", args, logger);
}

async function playErrorSound(config: KitConfig, logger: Logger): Promise<void> {
  if (!config.bells.enabled) {
    return;
  }

  if (process.platform !== "darwin") {
    writeTerminalBell(logger);
    return;
  }

  if (config.bells.errorSound === "Funk") {
    await runCommand("afplay", [FUNK_SOUND_PATH], logger);
  }
}

export async function notifyIdle(
  lastAssistantText: string,
  config: KitConfig,
  logger: Logger,
): Promise<void> {
  if (config.bells.enabled) {
    writeTerminalBell(logger);
  }

  if (config.speech.enabled && lastAssistantText.trim()) {
    await speak(lastAssistantText, config, logger);
  }

  logger.debug("idle.notify", "Idle notification processed", {
    bell: config.bells.enabled,
    speech: config.speech.enabled,
  });
}

export async function notifyError(config: KitConfig, logger: Logger): Promise<void> {
  await playErrorSound(config, logger);

  logger.warn("error.notify", "Error notification processed", {
    bell: config.bells.enabled,
    speech: false,
  });
}
