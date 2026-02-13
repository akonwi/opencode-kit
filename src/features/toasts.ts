import type { OpencodeClient } from "@opencode-ai/sdk";

import type { Logger } from "./logging";

export async function emitDebugToast(
  client: OpencodeClient,
  enabled: boolean,
  directory: string,
  message: string,
  logger: Logger,
): Promise<void> {
  if (!enabled) {
    return;
  }

  try {
    await client.tui.showToast({
      url: "/tui/show-toast",
      query: { directory },
      body: {
        title: "opencode-kit",
        message,
        variant: "info",
        duration: 1800,
      },
    });
  } catch (error) {
    logger.debug("toast.error", "Failed to emit TUI debug toast", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
