import {
  SESv2Client,
  PutSuppressedDestinationCommand,
  type SuppressionListReason,
} from "@aws-sdk/client-sesv2";
import { createLogger } from "./logger.js";

const logger = createLogger("ses-suppression");
const ses = new SESv2Client({});

export async function addToSuppressionList(
  email: string,
  reason: "BOUNCE" | "COMPLAINT",
): Promise<void> {
  try {
    await ses.send(
      new PutSuppressedDestinationCommand({
        EmailAddress: email,
        Reason: reason as SuppressionListReason,
      }),
    );
    logger.info("Added to SES suppression list", { email, reason });
  } catch (error) {
    logger.warn("Failed to add to SES suppression list", {
      email,
      reason,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
