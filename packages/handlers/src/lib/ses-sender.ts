import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { createLogger } from "./logger.js";

const logger = createLogger("ses-sender");
const ses = new SESv2Client({});

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  configurationSetName: string;
  unsubscribeUrl: string;
  replyToAddress?: string;
  templateKey: string;
  sequenceId: string;
  listUnsubscribe?: boolean;
}

export async function sendEmail(params: SendEmailParams): Promise<string> {
  logger.info("Sending email via SES", {
    to: params.to,
    subject: params.subject,
    templateKey: params.templateKey,
    sequenceId: params.sequenceId,
  });

  const result = await ses.send(
    new SendEmailCommand({
      FromEmailAddress: params.from,
      Destination: { ToAddresses: [params.to] },
      ...(params.replyToAddress ? { ReplyToAddresses: [params.replyToAddress] } : {}),
      Content: {
        Simple: {
          Subject: { Data: params.subject, Charset: "UTF-8" },
          Body: {
            Html: { Data: params.htmlBody, Charset: "UTF-8" },
          },
          Headers: [
            ...(params.listUnsubscribe !== false
              ? [
                  {
                    Name: "List-Unsubscribe",
                    Value: `<${params.unsubscribeUrl}>`,
                  },
                  {
                    Name: "List-Unsubscribe-Post",
                    Value: "List-Unsubscribe=One-Click",
                  },
                ]
              : []),
            {
              Name: "X-Template-Key",
              Value: params.templateKey,
            },
            {
              Name: "X-Sequence-Id",
              Value: params.sequenceId,
            },
          ],
        },
      },
      ConfigurationSetName: params.configurationSetName,
      EmailTags: [
        { Name: "templateKey", Value: params.templateKey.replace(/\//g, "--") },
        { Name: "sequenceId", Value: params.sequenceId },
      ],
    }),
  );

  const messageId = result.MessageId ?? "unknown";
  logger.info("Email sent successfully", {
    messageId,
    to: params.to,
    templateKey: params.templateKey,
  });
  return messageId;
}
