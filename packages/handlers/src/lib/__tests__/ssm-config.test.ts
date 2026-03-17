import { vi } from "vitest";

const mockSend = vi.fn();
vi.mock("@aws-sdk/client-ssm", () => ({
  SSMClient: class {
    send = mockSend;
  },
  GetParameterCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

// Must import after mock setup
const { getParameter, resolveConfig } = await import("../ssm-config.js");

beforeEach(() => {
  mockSend.mockReset();
});

describe("getParameter", () => {
  it("fetches from SSM and returns value", async () => {
    mockSend.mockResolvedValueOnce({
      Parameter: { Value: "my-table" },
    });

    const value = await getParameter("/test/param");
    expect(value).toBe("my-table");
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it("throws when parameter not found", async () => {
    mockSend.mockResolvedValueOnce({ Parameter: {} });

    await expect(getParameter("/test/missing")).rejects.toThrow("SSM parameter not found");
  });

  it("caches values for subsequent calls", async () => {
    mockSend.mockResolvedValueOnce({
      Parameter: { Value: "cached-value" },
    });

    const v1 = await getParameter("/test/cached");
    const v2 = await getParameter("/test/cached");

    expect(v1).toBe("cached-value");
    expect(v2).toBe("cached-value");
    expect(mockSend).toHaveBeenCalledOnce();
  });
});

describe("resolveConfig", () => {
  it("resolves all 8 SSM parameters", async () => {
    const params: Record<string, string> = {
      "table-name": "MainTable",
      "events-table-name": "EventsTable",
      "template-bucket": "my-bucket",
      "default-from-email": "noreply@example.com",
      "default-from-name": "Example",
      "ses-config-set": "my-config-set",
      "unsubscribe-base-url": "https://unsub.example.com",
      "unsubscribe-secret": "secret123",
    };

    mockSend.mockImplementation(async (cmd: { input: { Name: string } }) => {
      const suffix = cmd.input.Name.split("/").pop()!;
      const value = params[suffix];
      if (!value) throw new Error(`Unexpected param: ${cmd.input.Name}`);
      return { Parameter: { Value: value } };
    });

    const config = await resolveConfig();

    expect(config.tableName).toBe("MainTable");
    expect(config.eventsTableName).toBe("EventsTable");
    expect(config.templateBucket).toBe("my-bucket");
    expect(config.defaultFromEmail).toBe("noreply@example.com");
    expect(config.defaultFromName).toBe("Example");
    expect(config.sesConfigSet).toBe("my-config-set");
    expect(config.unsubscribeBaseUrl).toBe("https://unsub.example.com");
    expect(config.unsubscribeSecret).toBe("secret123");
  });
});
