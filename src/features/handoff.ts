import type { PluginInput } from "@opencode-ai/plugin";
import type { Part } from "@opencode-ai/sdk";

import type { Logger } from "./logging";

export interface HandoffResult {
  sourceSessionID: string;
  newSessionID?: string;
  summary: string;
  seededPrompt: string;
}

function extractText(parts: Part[]): string {
  return parts
    .map((part) => {
      if (part.type === "text" || part.type === "reasoning") {
        return part.text;
      }

      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function buildSessionSummary(
  input: PluginInput,
  logger: Logger,
  sessionID: string,
): Promise<string> {
  const messages = await input.client.session.messages({
    path: { id: sessionID },
    query: { directory: input.directory, limit: 20 },
  });

  if (messages.error || !messages.data) {
    logger.warn("handoff.summary_fallback", "Could not read session messages for summary", {
      sessionID,
    });
    return "Prior session context is available via the source session reference.";
  }

  const snippets: string[] = [];
  for (const item of [...messages.data].reverse()) {
    const text = extractText(item.parts);
    if (!text) {
      continue;
    }

    snippets.push(text);
    if (snippets.length >= 4) {
      break;
    }
  }

  if (snippets.length === 0) {
    return "Prior session context is available via the source session reference.";
  }

  const joined = snippets.join("\n\n").trim();
  return joined.length > 1400 ? `${joined.slice(0, 1397)}...` : joined;
}

function buildBootstrapPrompt(result: HandoffResult, nextPrompt: string): string {
  return [
    nextPrompt.trim() || "Continue from this handoff context.",
    "",
    "---",
    "",
    "Handoff context from prior session:",
    "",
    result.summary,
    "",
    `Source session ID: ${result.sourceSessionID}`,
    "",
    "Use this source session ID to retrieve prior session context if needed.",
  ].join("\n");
}

async function showHandoffToast(
  input: PluginInput,
  logger: Logger,
  message: string,
  variant: "info" | "success" | "warning" | "error",
): Promise<void> {
  const toast = await input.client.tui.showToast({
    query: { directory: input.directory },
    body: {
      title: "opencode-kit handoff",
      message,
      variant,
      duration: 2200,
    },
  });

  if (toast.error || !toast.data) {
    logger.debug("handoff.toast_skip", "Could not display handoff toast", {
      message,
      variant,
    });
  }
}

export async function runHandoff(
  input: PluginInput,
  logger: Logger,
  sessionID: string,
  nextPrompt: string,
): Promise<HandoffResult> {
  logger.info("handoff.start", "Starting handoff", { sessionID });

  const summary = await buildSessionSummary(input, logger, sessionID);
  logger.info("handoff.summary_ready", "Prepared handoff summary", {
    sessionID,
    summaryLength: summary.length,
  });

  const result: HandoffResult = {
    sourceSessionID: sessionID,
    summary,
    seededPrompt: "",
  };

  const handoffPrompt = buildBootstrapPrompt(result, nextPrompt);
  result.seededPrompt = handoffPrompt;

  const created = await input.client.session.create({
    query: { directory: input.directory },
  });

  if (created.error || !created.data) {
    throw new Error("handoff failed during session_create");
  }

  result.newSessionID = created.data.id;

  await showHandoffToast(
    input,
    logger,
    `Created handoff session (${result.newSessionID}).`,
    "info",
  );

  const openedSessions = await input.client.tui.openSessions({
    query: { directory: input.directory },
  });

  if (openedSessions.error || !openedSessions.data) {
    logger.warn("handoff.open_sessions_warn", "Could not open session selector", {
      sourceSessionID: result.sourceSessionID,
      newSessionID: result.newSessionID,
    });
  }

  const seeded = await input.client.session.prompt({
    path: { id: result.newSessionID },
    query: { directory: input.directory },
    body: {
      noReply: false,
      parts: [
        {
          type: "text",
          text: handoffPrompt,
        },
      ],
    },
  });

  if (seeded.error || !seeded.data) {
    throw new Error("handoff failed during seed_new_session");
  }

  logger.info("handoff.transitioned", "Created and seeded new session, opened selector", {
    sourceSessionID: result.sourceSessionID,
    newSessionID: result.newSessionID,
  });

  return result;
}
