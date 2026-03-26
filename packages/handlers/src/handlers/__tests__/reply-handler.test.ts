import { vi } from "vitest";
import type { SNSEvent } from "aws-lambda";

const mockResolveConfig = vi.fn();
const mockDynamoSend = vi.fn();
const mockEventBridgeSend = vi.fn();
const mockGetSubscriberProfile = vi.fn();
const mockGetSendLogByMessageId = vi.fn();

vi.mock("../../lib/config.js", () => ({
  resolveConfig: () => mockResolveConfig(),
}));

vi.mock("../../lib/dynamo-client.js", () => ({
  getSubscriberProfile: (...args: unknown[]) => mockGetSubscriberProfile(...args),
  getSendLogByMessageId: (...args: unknown[]) => mockGetSendLogByMessageId(...args),
}));

vi.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: class {
    send = mockDynamoSend;
  },
  PutItemCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

vi.mock("@aws-sdk/util-dynamodb", async () => {
  const actual = await vi.importActual("@aws-sdk/util-dynamodb");
  return actual;
});

vi.mock("@aws-sdk/client-eventbridge", () => ({
  EventBridgeClient: class {
    send = mockEventBridgeSend;
  },
  PutEventsCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

vi.mock("mailparser", () => ({
  simpleParser: vi.fn().mockImplementation(async (content: string) => {
    // Simple mock parser that extracts basic fields from raw email
    const lines = content.split("\n");
    const headers: Record<string, string> = {};
    let inBody = false;
    let body = "";
    for (const line of lines) {
      if (inBody) {
        body += line + "\n";
        continue;
      }
      if (line.trim() === "") {
        inBody = true;
        continue;
      }
      const match = line.match(/^([^:]+):\s*(.+)$/);
      if (match) {
        headers[match[1].toLowerCase()] = match[2];
      }
    }
    return {
      from: headers.from ? { value: [{ address: headers.from }] } : undefined,
      subject: headers.subject,
      text: body.trim(),
      inReplyTo: headers["in-reply-to"],
    };
  }),
}));

const { handler } = await import("../reply-handler.js");

const CONFIG = {
  tableName: "TestTable",
  eventsTableName: "EventsTable",
  eventBusName: "test-bus",
};

function makeRawEmail(opts: {
  from: string;
  subject: string;
  body: string;
  inReplyTo?: string;
}): string {
  let headers = `From: ${opts.from}\nSubject: ${opts.subject}`;
  if (opts.inReplyTo) {
    headers += `\nIn-Reply-To: ${opts.inReplyTo}`;
  }
  return `${headers}\n\n${opts.body}`;
}

function snsEvent(notification: unknown): SNSEvent {
  return {
    Records: [{ Sns: { Message: JSON.stringify(notification) } }],
  } as SNSEvent;
}

function receiptNotification(rawEmail: string) {
  return {
    notificationType: "Received",
    receipt: {
      timestamp: "2026-03-26T10:00:00.000Z",
      action: { type: "SNS" },
    },
    mail: {
      source: "subscriber@example.com",
      commonHeaders: {
        from: ["subscriber@example.com"],
        subject: "Re: Hello",
        messageId: "<inbound-msg-id>",
      },
      headers: [],
    },
    content: rawEmail,
  };
}

beforeEach(() => {
  mockResolveConfig.mockReset().mockReturnValue(CONFIG);
  mockDynamoSend.mockReset().mockResolvedValue({});
  mockEventBridgeSend.mockReset().mockResolvedValue({});
  mockGetSubscriberProfile.mockReset();
  mockGetSendLogByMessageId.mockReset();
});

describe("reply-handler", () => {
  it("writes reply event and publishes to EventBridge for known subscriber", async () => {
    mockGetSubscriberProfile.mockResolvedValue({
      PK: "SUB#subscriber@example.com",
      SK: "PROFILE",
      email: "subscriber@example.com",
      firstName: "Test",
    });

    const rawEmail = makeRawEmail({
      from: "subscriber@example.com",
      subject: "Re: Hello",
      body: "Thanks for reaching out!",
    });

    await handler(snsEvent(receiptNotification(rawEmail)));

    // Should write to Events table
    expect(mockDynamoSend).toHaveBeenCalledOnce();
    const putCmd = mockDynamoSend.mock.calls[0][0];
    expect(putCmd.input.TableName).toBe("EventsTable");

    // Should publish to EventBridge
    expect(mockEventBridgeSend).toHaveBeenCalledOnce();
    const ebCmd = mockEventBridgeSend.mock.calls[0][0];
    expect(ebCmd.input.Entries[0].DetailType).toBe("email.replied");
    expect(ebCmd.input.Entries[0].EventBusName).toBe("test-bus");
    const detail = JSON.parse(ebCmd.input.Entries[0].Detail);
    expect(detail.email).toBe("subscriber@example.com");
    expect(detail.subject).toBe("Re: Hello");
  });

  it("skips unknown senders (not a subscriber)", async () => {
    mockGetSubscriberProfile.mockResolvedValue(null);

    const rawEmail = makeRawEmail({
      from: "stranger@example.com",
      subject: "Hi there",
      body: "Random email",
    });

    await handler(snsEvent(receiptNotification(rawEmail)));

    expect(mockDynamoSend).not.toHaveBeenCalled();
    expect(mockEventBridgeSend).not.toHaveBeenCalled();
  });

  it("correlates reply to original email via In-Reply-To header", async () => {
    mockGetSubscriberProfile.mockResolvedValue({
      PK: "SUB#subscriber@example.com",
      SK: "PROFILE",
      email: "subscriber@example.com",
      firstName: "Test",
    });
    mockGetSendLogByMessageId.mockResolvedValue({
      sequenceId: "cold-outreach",
      templateKey: "outreach/intro",
    });

    const rawEmail = makeRawEmail({
      from: "subscriber@example.com",
      subject: "Re: Intro",
      body: "Interested!",
      inReplyTo: "<original-ses-message-id>",
    });

    await handler(snsEvent(receiptNotification(rawEmail)));

    // Should query send log with cleaned message ID
    expect(mockGetSendLogByMessageId).toHaveBeenCalledWith(
      "TestTable",
      "subscriber@example.com",
      "original-ses-message-id",
    );

    // EventBridge event should include correlated sequenceId
    const ebCmd = mockEventBridgeSend.mock.calls[0][0];
    const detail = JSON.parse(ebCmd.input.Entries[0].Detail);
    expect(detail.sequenceId).toBe("cold-outreach");
    expect(detail.templateKey).toBe("outreach/intro");
  });

  it("skips non-Received notification types", async () => {
    const event = snsEvent({
      notificationType: "Bounce",
      bounce: {},
    });

    await handler(event);

    expect(mockGetSubscriberProfile).not.toHaveBeenCalled();
    expect(mockDynamoSend).not.toHaveBeenCalled();
  });

  it("skips EventBridge publish when eventBusName is empty", async () => {
    mockResolveConfig.mockReturnValue({ ...CONFIG, eventBusName: "" });
    mockGetSubscriberProfile.mockResolvedValue({
      PK: "SUB#subscriber@example.com",
      SK: "PROFILE",
      email: "subscriber@example.com",
      firstName: "Test",
    });

    const rawEmail = makeRawEmail({
      from: "subscriber@example.com",
      subject: "Re: Hello",
      body: "Thanks!",
    });

    await handler(snsEvent(receiptNotification(rawEmail)));

    // Should still write to Events table
    expect(mockDynamoSend).toHaveBeenCalledOnce();
    // Should NOT publish to EventBridge
    expect(mockEventBridgeSend).not.toHaveBeenCalled();
  });
});
