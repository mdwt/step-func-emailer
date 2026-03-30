import * as fs from "node:fs";
import * as path from "node:path";
import type { SequenceDefinition, SequenceStep } from "@mailshot/shared";

/**
 * Scans sequences/ * /sequence.config.ts and loads each definition.
 * Works because CDK is invoked via tsx which registers the TS loader.
 */
export function loadSequenceConfigs(sequencesDir?: string): SequenceDefinition[] {
  const dir = sequencesDir ?? path.resolve(process.cwd(), "sequences");

  if (!fs.existsSync(dir)) {
    return [];
  }

  const definitions: SequenceDefinition[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const configPath = path.join(dir, entry.name, "sequence.config.ts");
    if (!fs.existsSync(configPath)) continue;

    const mod = require(configPath);
    const def: SequenceDefinition = mod.default ?? mod.sequence;

    if (!def) {
      throw new Error(`${configPath}: must export a default or named 'sequence' export`);
    }
    if (!def.id) {
      throw new Error(`${configPath}: missing 'id'`);
    }
    if (!def.trigger?.detailType) {
      throw new Error(`${configPath}: missing 'trigger.detailType'`);
    }

    if (!Array.isArray(def.steps)) {
      throw new Error(`${configPath}: missing 'steps' array`);
    }
    if (!def.timeoutMinutes) {
      throw new Error(`${configPath}: missing 'timeoutMinutes'`);
    }
    if (!def.sender?.fromEmail) {
      throw new Error(`${configPath}: missing 'sender.fromEmail'`);
    }
    if (!def.sender?.fromName) {
      throw new Error(`${configPath}: missing 'sender.fromName'`);
    }
    if (def.sender?.captureReplies && !def.sender?.replyToEmail) {
      throw new Error(`${configPath}: 'sender.captureReplies' requires 'sender.replyToEmail'`);
    }

    validateSteps(def.steps, configPath);
    definitions.push(def);
  }

  return definitions;
}

function validateSteps(steps: SequenceStep[], configPath: string): void {
  for (const step of steps) {
    if (step.type === "send") {
      const hasVariants = step.variants && step.variants.length > 0;
      const hasDirect = step.templateKey && step.subject;
      if (hasVariants && hasDirect) {
        throw new Error(
          `${configPath}: send step cannot have both 'templateKey'/'subject' and 'variants'`,
        );
      }
      if (!hasVariants && !hasDirect) {
        throw new Error(
          `${configPath}: send step must have either 'templateKey'+'subject' or 'variants'`,
        );
      }
      if (hasVariants) {
        if (step.variants!.length < 2) {
          throw new Error(`${configPath}: 'variants' must have at least 2 entries`);
        }
        for (const v of step.variants!) {
          if (!v.templateKey || !v.subject) {
            throw new Error(`${configPath}: each variant must have 'templateKey' and 'subject'`);
          }
        }
      }
    } else if (step.type === "condition") {
      validateSteps(step.then, configPath);
      if (step.else) validateSteps(step.else, configPath);
    } else if (step.type === "choice") {
      for (const branch of step.branches) {
        validateSteps(branch.steps, configPath);
      }
      if (step.default) validateSteps(step.default, configPath);
    }
  }
}
