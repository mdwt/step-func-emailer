import {
  subscriberPK,
  executionSK,
  sentSK,
  eventSK,
  PROFILE_SK,
  EXEC_SK_PREFIX,
  SENT_SK_PREFIX,
  SUPPRESSION_SK,
  EVT_SK_PREFIX,
  TEMPLATE_INDEX,
  TEMPLATE_CACHE_TTL_MS,
} from "../constants.js";

describe("subscriberPK", () => {
  it("prefixes email with SUB#", () => {
    expect(subscriberPK("user@example.com")).toBe("SUB#user@example.com");
  });

  it("handles empty string", () => {
    expect(subscriberPK("")).toBe("SUB#");
  });
});

describe("executionSK", () => {
  it("prefixes sequenceId with EXEC#", () => {
    expect(executionSK("onboarding")).toBe("EXEC#onboarding");
  });
});

describe("sentSK", () => {
  it("prefixes timestamp with SENT#", () => {
    const ts = "2026-01-15T10:00:00.000Z";
    expect(sentSK(ts)).toBe(`SENT#${ts}`);
  });
});

describe("eventSK", () => {
  it("builds EVT#timestamp#eventType", () => {
    const ts = "2026-01-15T10:00:00.000Z";
    expect(eventSK(ts, "open")).toBe(`EVT#${ts}#open`);
  });
});

describe("constants", () => {
  it("exports expected static values", () => {
    expect(PROFILE_SK).toBe("PROFILE");
    expect(EXEC_SK_PREFIX).toBe("EXEC#");
    expect(SENT_SK_PREFIX).toBe("SENT#");
    expect(SUPPRESSION_SK).toBe("SUPPRESSION");
    expect(EVT_SK_PREFIX).toBe("EVT#");
    expect(TEMPLATE_INDEX).toBe("TemplateIndex");
    expect(TEMPLATE_CACHE_TTL_MS).toBe(600_000);
  });
});
