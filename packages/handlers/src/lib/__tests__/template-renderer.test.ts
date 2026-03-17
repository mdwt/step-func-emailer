import { vi } from "vitest";

const mockSend = vi.fn();
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    send = mockSend;
  },
  GetObjectCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

const { renderTemplate } = await import("../template-renderer.js");

beforeEach(() => {
  mockSend.mockReset();
});

describe("renderTemplate", () => {
  it("fetches template from S3 and renders with LiquidJS", async () => {
    mockSend.mockResolvedValueOnce({
      Body: {
        transformToString: () => Promise.resolve("<h1>Hello {{ firstName }}</h1>"),
      },
    });

    const result = await renderTemplate("my-bucket", "welcome", {
      email: "user@example.com",
      firstName: "Jane",
      unsubscribeUrl: "https://unsub.example.com",
      currentYear: 2026,
    });

    expect(result).toBe("<h1>Hello Jane</h1>");
  });

  it("fetches template with .html extension", async () => {
    mockSend.mockResolvedValueOnce({
      Body: {
        transformToString: () => Promise.resolve("<p>Hi</p>"),
      },
    });

    await renderTemplate("my-bucket", "onboarding/step1", {
      email: "user@example.com",
      firstName: "Jane",
      unsubscribeUrl: "https://unsub.example.com",
      currentYear: 2026,
    });

    const cmd = mockSend.mock.calls[0][0];
    expect(cmd.input.Bucket).toBe("my-bucket");
    expect(cmd.input.Key).toBe("onboarding/step1.html");
  });

  it("renders multiple Liquid variables", async () => {
    mockSend.mockResolvedValueOnce({
      Body: {
        transformToString: () =>
          Promise.resolve(
            "Hi {{ firstName }}, your email is {{ email }}. Year: {{ currentYear }}. <a href='{{ unsubscribeUrl }}'>Unsub</a>",
          ),
      },
    });

    const result = await renderTemplate("my-bucket", "multi-var", {
      email: "jane@example.com",
      firstName: "Jane",
      unsubscribeUrl: "https://unsub.example.com?token=abc",
      currentYear: 2026,
    });

    expect(result).toContain("Jane");
    expect(result).toContain("jane@example.com");
    expect(result).toContain("2026");
    expect(result).toContain("https://unsub.example.com?token=abc");
  });

  it("handles empty template body gracefully", async () => {
    mockSend.mockResolvedValueOnce({
      Body: { transformToString: () => Promise.resolve("") },
    });

    const result = await renderTemplate("my-bucket", "empty", {
      email: "user@example.com",
      firstName: "Jane",
      unsubscribeUrl: "https://unsub.example.com",
      currentYear: 2026,
    });

    expect(result).toBe("");
  });
});
