import { generateToken, validateToken } from "../unsubscribe-token.js";

const SECRET = "test-secret-key";

describe("unsubscribe-token", () => {
  describe("generateToken", () => {
    it("returns a base64url-encoded string", () => {
      const token = generateToken("user@example.com", SECRET);
      expect(token).toBeTruthy();
      // base64url chars only
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("produces different tokens for different emails", () => {
      const t1 = generateToken("a@example.com", SECRET);
      const t2 = generateToken("b@example.com", SECRET);
      expect(t1).not.toBe(t2);
    });

    it("produces different tokens for different secrets", () => {
      const t1 = generateToken("user@example.com", "secret-1");
      const t2 = generateToken("user@example.com", "secret-2");
      expect(t1).not.toBe(t2);
    });
  });

  describe("validateToken", () => {
    it("validates a freshly generated token", () => {
      const token = generateToken("user@example.com", SECRET);
      const result = validateToken(token, SECRET);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.email).toBe("user@example.com");
        expect(result.sendTimestamp).toBeTruthy();
        expect(result.expiryTimestamp).toBeTruthy();
      }
    });

    it("rejects token with wrong secret", () => {
      const token = generateToken("user@example.com", SECRET);
      const result = validateToken(token, "wrong-secret");
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe("invalid signature");
      }
    });

    it("rejects malformed token", () => {
      const result = validateToken("not-a-valid-token", SECRET);
      expect(result.valid).toBe(false);
    });

    it("rejects expired token", () => {
      // Manually craft an expired token
      const { createHmac } = require("node:crypto");
      const email = "user@example.com";
      const sendTimestamp = "2020-01-01T00:00:00.000Z";
      const expiryTimestamp = "2020-04-01T00:00:00.000Z"; // expired
      const payload = `${email}|${sendTimestamp}|${expiryTimestamp}`;
      const signature = createHmac("sha256", SECRET).update(payload).digest("hex");
      const token = Buffer.from(`${payload}|${signature}`).toString("base64url");

      const result = validateToken(token, SECRET);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe("token expired");
      }
    });

    it("rejects token with wrong part count", () => {
      const token = Buffer.from("a|b|c|d|e").toString("base64url");
      const result = validateToken(token, SECRET);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toBe("malformed token");
      }
    });
  });
});
