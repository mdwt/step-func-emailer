import type { SNSEvent } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { simpleParser } from "mailparser";
import { subscriberPK, eventSK } from "@mailshot/shared";
import { resolveConfig } from "../lib/config.js";
import { getSubscriberProfile, getSendLogByMessageId } from "../lib/dynamo-client.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("reply-handler");
const dynamo = new DynamoDBClient({});
const eventBridge = new EventBridgeClient({});
const ses = new SESv2Client({});

interface SESReceiptNotification {
  notificationType: "Received";
  receipt: {
    timestamp: string;
    recipients: string[];
    action: { type: string };
  };
  mail: {
    source: string;
    commonHeaders: {
      from: string[];
      subject: string;
      messageId: string;
    };
    headers: Array<{ name: string; value: string }>;
  };
  content: string; // Raw MIME email content
}

function extractHeader(
  headers: Array<{ name: string; value: string }>,
  name: string,
): string | undefined {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;
}

export const handler = async (event: SNSEvent): Promise<void> => {
  logger.info("ReplyHandler invoked", { recordCount: event.Records.length });
  const config = resolveConfig();

  for (const record of event.Records) {
    const notification = JSON.parse(record.Sns.Message) as SESReceiptNotification;

    if (notification.notificationType !== "Received") {
      logger.debug("Skipping non-received notification", {
        type: notification.notificationType,
      });
      continue;
    }

    // Parse the raw email content from the SNS notification
    const parsed = await simpleParser(notification.content);
    const fromAddress = parsed.from?.value?.[0]?.address ?? notification.mail.source;
    const subject = parsed.subject ?? notification.mail.commonHeaders.subject ?? "";
    const body = parsed.text ?? "";
    const inReplyTo = parsed.inReplyTo ?? extractHeader(notification.mail.headers, "In-Reply-To");

    logger.info("Processing inbound reply", {
      from: fromAddress,
      subject,
      inReplyTo,
    });

    // Look up subscriber by sender email
    const profile = await getSubscriberProfile(config.tableName, fromAddress);
    if (!profile) {
      logger.info("Sender is not a known subscriber, skipping", {
        from: fromAddress,
      });
      continue;
    }

    // Best-effort correlation: match In-Reply-To header to send log
    let sequenceId = "";
    let templateKey = "";
    if (inReplyTo) {
      // In-Reply-To often contains the SES message ID (angle-bracket wrapped)
      const messageId = inReplyTo.replace(/^<|>$/g, "");
      const sendLog = await getSendLogByMessageId(config.tableName, fromAddress, messageId);
      if (sendLog) {
        sequenceId = sendLog.sequenceId;
        templateKey = sendLog.templateKey;
        logger.info("Correlated reply to original email", {
          sequenceId,
          templateKey,
          sesMessageId: messageId,
        });
      }
    }

    // Write reply event to Events table (same pattern as engagement-handler)
    const timestamp = notification.receipt.timestamp;
    const now = new Date();
    const ttl = config.dataTtlDays
      ? Math.floor(now.getTime() / 1000) + config.dataTtlDays * 86400
      : undefined;

    await dynamo.send(
      new PutItemCommand({
        TableName: config.eventsTableName,
        Item: marshall(
          {
            PK: subscriberPK(fromAddress),
            SK: eventSK(timestamp, "reply"),
            eventType: "reply",
            subject,
            body,
            templateKey,
            sequenceId,
            sesMessageId: inReplyTo?.replace(/^<|>$/g, "") ?? "",
            timestamp,
            ...(ttl !== undefined ? { ttl } : {}),
          },
          { removeUndefinedValues: true },
        ),
      }),
    );

    logger.info("Reply event written to Events table", {
      email: fromAddress,
      subject,
    });

    // Publish email.replied event to EventBridge
    if (config.eventBusName) {
      await eventBridge.send(
        new PutEventsCommand({
          Entries: [
            {
              EventBusName: config.eventBusName,
              Source: "mailshot",
              DetailType: "email.replied",
              Detail: JSON.stringify({
                email: fromAddress,
                subject,
                sequenceId,
                templateKey,
              }),
            },
          ],
        }),
      );

      logger.info("Published email.replied event to EventBridge", {
        email: fromAddress,
        eventBus: config.eventBusName,
      });
    }

    // Forward reply to configured inbox
    if (config.replyForwardTo) {
      const recipient = notification.receipt.recipients[0]?.toLowerCase();
      try {
        const rewritten = rewriteFromHeader(notification.content, {
          newFrom: `"Reply from ${fromAddress}" <${recipient}>`,
          replyTo: fromAddress,
        });

        await ses.send(
          new SendEmailCommand({
            Destination: { ToAddresses: [config.replyForwardTo] },
            Content: {
              Raw: { Data: new Uint8Array(Buffer.from(rewritten, "utf-8")) },
            },
          }),
        );

        logger.info("Forwarded reply", {
          from: fromAddress,
          forwardTo: config.replyForwardTo,
          recipient,
        });
      } catch (err) {
        logger.error("Failed to forward reply", {
          error: err instanceof Error ? err.message : String(err),
          from: fromAddress,
          forwardTo: config.replyForwardTo,
        });
      }
    }
  }

  logger.info("ReplyHandler complete");
};

function rewriteFromHeader(rawEmail: string, opts: { newFrom: string; replyTo: string }): string {
  // Replace From: header with the verified sender and add Reply-To for the original sender
  const result = rawEmail.replace(
    /^From:\s*.+$/im,
    `From: ${opts.newFrom}\r\nReply-To: ${opts.replyTo}\r\nX-Original-From: ${opts.replyTo}`,
  );
  // Remove any existing Reply-To that isn't ours (avoid duplicates)
  const lines = result.split(/\r?\n/);
  let seenOurReplyTo = false;
  const filtered = lines.filter((line) => {
    if (/^Reply-To:/i.test(line)) {
      if (!seenOurReplyTo) {
        seenOurReplyTo = true;
        return true; // keep our first Reply-To
      }
      return false; // drop subsequent Reply-To headers
    }
    return true;
  });
  return filtered.join("\r\n");
}
