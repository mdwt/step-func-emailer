import { vi } from "vitest";

const mockSfnSend = vi.fn();
vi.mock("@aws-sdk/client-sfn", () => ({
  SFNClient: class {
    send = mockSfnSend;
  },
  StopExecutionCommand: class {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  },
}));

const mockGetAllExecutions = vi.fn();
const mockDeleteExecution = vi.fn();
vi.mock("../dynamo-client.js", () => ({
  getAllExecutions: (...args: unknown[]) => mockGetAllExecutions(...args),
  deleteExecution: (...args: unknown[]) => mockDeleteExecution(...args),
}));

const { stopAllExecutions } = await import("../execution-stopper.js");

beforeEach(() => {
  mockSfnSend.mockReset();
  mockGetAllExecutions.mockReset();
  mockDeleteExecution.mockReset();
});

describe("stopAllExecutions", () => {
  it("stops and deletes all active executions", async () => {
    mockGetAllExecutions.mockResolvedValueOnce([
      { executionArn: "arn:1", sequenceId: "onboarding" },
      { executionArn: "arn:2", sequenceId: "win-back" },
    ]);
    mockSfnSend.mockResolvedValue({});
    mockDeleteExecution.mockResolvedValue(undefined);

    await stopAllExecutions("TestTable", "user@example.com");

    expect(mockSfnSend).toHaveBeenCalledTimes(2);
    expect(mockDeleteExecution).toHaveBeenCalledTimes(2);
    expect(mockDeleteExecution).toHaveBeenCalledWith("TestTable", "user@example.com", "onboarding");
    expect(mockDeleteExecution).toHaveBeenCalledWith("TestTable", "user@example.com", "win-back");
  });

  it("does nothing when no executions exist", async () => {
    mockGetAllExecutions.mockResolvedValueOnce([]);

    await stopAllExecutions("TestTable", "user@example.com");

    expect(mockSfnSend).not.toHaveBeenCalled();
    expect(mockDeleteExecution).not.toHaveBeenCalled();
  });

  it("continues when SFN stop fails (already stopped)", async () => {
    mockGetAllExecutions.mockResolvedValueOnce([
      { executionArn: "arn:1", sequenceId: "onboarding" },
    ]);
    mockSfnSend.mockRejectedValueOnce(new Error("ExecutionDoesNotExist"));
    mockDeleteExecution.mockResolvedValue(undefined);

    await expect(stopAllExecutions("TestTable", "user@example.com")).resolves.toBeUndefined();

    expect(mockDeleteExecution).toHaveBeenCalledOnce();
  });
});
