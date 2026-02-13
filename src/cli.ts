#!/usr/bin/env node

import { CONFIG_PATH, readConfig, updateConfig } from "./config";

type Topic = "bells" | "speech";
type Action = "on" | "off" | "toggle" | "status";

function printUsage(): void {
  const lines = [
    "Usage:",
    "  oc-kit bells on|off|toggle|status",
    "  oc-kit speech on|off|toggle|status",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

function asTopic(input: string | undefined): Topic | null {
  if (input === "bells" || input === "speech") {
    return input;
  }

  return null;
}

function asAction(input: string | undefined): Action | null {
  if (input === "on" || input === "off" || input === "toggle" || input === "status") {
    return input;
  }

  return null;
}

async function getStatusLine(): Promise<string> {
  const config = await readConfig();
  return `bells=${config.bells.enabled ? "on" : "off"} speech=${config.speech.enabled ? "on" : "off"}`;
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const topic = asTopic(args[0]);
  const action = asAction(args[1]);

  if (!topic || !action) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  if (action === "status") {
    const line = await getStatusLine();
    process.stdout.write(`${line}\nconfig=${CONFIG_PATH}\n`);
    return;
  }

  const updated = await updateConfig((current) => {
    const enabled = topic === "bells" ? current.bells.enabled : current.speech.enabled;
    const nextEnabled = action === "toggle" ? !enabled : action === "on";

    if (topic === "bells") {
      return {
        ...current,
        bells: {
          ...current.bells,
          enabled: nextEnabled,
        },
      };
    }

    return {
      ...current,
      speech: {
        ...current.speech,
        enabled: nextEnabled,
      },
    };
  });

  process.stdout.write(
    `updated ${topic}.enabled=${topic === "bells" ? updated.bells.enabled : updated.speech.enabled}\n`,
  );
  process.stdout.write(
    `status bells=${updated.bells.enabled ? "on" : "off"} speech=${updated.speech.enabled ? "on" : "off"}\n`,
  );
  process.stdout.write(`config=${CONFIG_PATH}\n`);
}

void run();
