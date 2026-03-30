import { vi } from "vitest";

const mockSend = vi.fn();
vi.mock("@aws-sdk/client-sesv2", () => ({
  SESv2Client: class {
    send = mockSend;
  },
  SendEmailCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

const { sendEmail } = await import("../ses-sender.js");

beforeEach(() => {
  mockSend.mockReset();
});

describe("sendEmail", () => {
  const defaultParams = {
    from: "Test <noreply@example.com>",
    to: "user@example.com",
    subject: "Welcome!",
    htmlBody: "<h1>Hello</h1>",
    configurationSetName: "my-config-set",
    unsubscribeUrl: "https://unsub.example.com?token=abc",
    templateKey: "onboarding/welcome",
    sequenceId: "onboarding",
  };

  it("sends email and returns messageId", async () => {
    mockSend.mockResolvedValueOnce({ MessageId: "ses-msg-123" });

    const messageId = await sendEmail(defaultParams);

    expect(messageId).toBe("ses-msg-123");
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("returns 'unknown' when MessageId is missing", async () => {
    mockSend.mockResolvedValueOnce({});

    const messageId = await sendEmail(defaultParams);
    expect(messageId).toBe("unknown");
  });

  it("includes List-Unsubscribe headers", async () => {
    mockSend.mockResolvedValueOnce({ MessageId: "msg-1" });

    await sendEmail(defaultParams);

    const cmd = mockSend.mock.calls[0][0];
    const headers = cmd.input.Content.Simple.Headers;
    expect(headers).toContainEqual({
      Name: "List-Unsubscribe",
      Value: `<${defaultParams.unsubscribeUrl}>`,
    });
    expect(headers).toContainEqual({
      Name: "List-Unsubscribe-Post",
      Value: "List-Unsubscribe=One-Click",
    });
  });

  it("omits List-Unsubscribe headers when listUnsubscribe is false", async () => {
    mockSend.mockResolvedValueOnce({ MessageId: "msg-1" });

    await sendEmail({ ...defaultParams, listUnsubscribe: false });

    const cmd = mockSend.mock.calls[0][0];
    const headers = cmd.input.Content.Simple.Headers;
    expect(headers).not.toContainEqual(expect.objectContaining({ Name: "List-Unsubscribe" }));
    expect(headers).not.toContainEqual(expect.objectContaining({ Name: "List-Unsubscribe-Post" }));
    expect(headers).toContainEqual({
      Name: "X-Template-Key",
      Value: defaultParams.templateKey,
    });
  });

  it("sets correct destination and from address", async () => {
    mockSend.mockResolvedValueOnce({ MessageId: "msg-1" });

    await sendEmail(defaultParams);

    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.input.FromEmailAddress).toBe(defaultParams.from);
    expect(cmd.input.Destination.ToAddresses).toEqual([defaultParams.to]);
  });

  it("sends HTML-only without text/plain part", async () => {
    mockSend.mockResolvedValueOnce({ MessageId: "msg-1" });

    await sendEmail(defaultParams);

    const cmd = mockSend.mock.calls[0][0];
    const body = cmd.input.Content.Simple.Body;
    expect(body.Html).toBeDefined();
    expect(body.Text).toBeUndefined();
  });

  it("uses the configuration set name", async () => {
    mockSend.mockResolvedValueOnce({ MessageId: "msg-1" });

    await sendEmail(defaultParams);

    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.input.ConfigurationSetName).toBe("my-config-set");
  });
});
