import type { Plugin } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";

import { readConfig } from "./config";
import { createLogger } from "./features/logging";
import { notifyError, notifyIdle } from "./features/sounds";

function getErrorMessage(event: Event): string {
  if (event.type !== "session.error") {
    return "Unknown error";
  }

  const rawError = event.properties.error;
  if (!rawError) {
    return "Agent encountered an error.";
  }

  const errorData = rawError.data;
  if (errorData && typeof errorData === "object") {
    if (
      "message" in errorData &&
      typeof errorData.message === "string" &&
      errorData.message.trim()
    ) {
      return `Agent encountered an error: ${errorData.message.trim()}`;
    }
  }

  if (typeof rawError.name === "string" && rawError.name.trim()) {
    return `Agent encountered an error: ${rawError.name.trim()}`;
  }

  return "Agent encountered an error.";
}

export const OpencodeKit: Plugin = async (input) => {
  const logger = createLogger();
  const latestAssistantMessageBySession = new Map<string, string>();
  const latestAssistantTextByMessage = new Map<string, string>();
  const lastSpokenMessageBySession = new Map<string, string>();

  return {
    event: async ({ event }): Promise<void> => {
      if (event.type === "message.updated") {
        const info = event.properties.info;
        if (info.role === "assistant") {
          latestAssistantMessageBySession.set(info.sessionID, info.id);
        }
        return;
      }

      if (event.type === "message.part.updated") {
        const part = event.properties.part;
        if (
          part.type === "text" &&
          typeof part.messageID === "string" &&
          typeof part.text === "string"
        ) {
          latestAssistantTextByMessage.set(part.messageID, part.text);
        }
        return;
      }

      if (event.type !== "session.idle" && event.type !== "session.error") {
        return;
      }

      const config = await readConfig();
      logger.setLevel(config.debug.logLevel);

      if (event.type === "session.idle") {
        const sessionID = event.properties.sessionID;
        const latestMessageID = latestAssistantMessageBySession.get(sessionID);
        const lastText = latestMessageID
          ? (latestAssistantTextByMessage.get(latestMessageID) ?? "")
          : "";
        const previouslySpoken = lastSpokenMessageBySession.get(sessionID);

        if (latestMessageID && previouslySpoken === latestMessageID) {
          logger.debug("idle.skip_duplicate", "Skipping duplicate idle speech", {
            sessionID,
            messageID: latestMessageID,
          });
          return;
        }

        if (!latestMessageID || !lastText) {
          logger.warn("idle.no_summary", "No cached assistant summary for idle event", {
            sessionID,
            hasMessageID: Boolean(latestMessageID),
            hasText: Boolean(lastText),
          });
          await notifyIdle("", config, logger);
          return;
        }

        lastSpokenMessageBySession.set(sessionID, latestMessageID);
        await notifyIdle(lastText, config, logger);
        return;
      }

      logger.warn("error.detected", getErrorMessage(event), {
        eventType: event.type,
      });
      await notifyError(config, logger);
    },
  };
};

export default OpencodeKit;
