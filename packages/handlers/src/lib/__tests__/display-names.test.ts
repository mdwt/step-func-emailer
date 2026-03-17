import { resolveDisplayNames } from "../display-names.js";

describe("resolveDisplayNames", () => {
  const displayNameMap = {
    platformName: {
      web: "Web App",
      ios: "iPhone App",
      android: "Android App",
    },
    roleName: {
      admin: "Administrator",
      user: "Standard User",
    },
  };

  it("resolves known values to display names", () => {
    const result = resolveDisplayNames(displayNameMap, {
      platform: "web",
      role: "admin",
    });
    expect(result).toEqual({
      platformName: "Web App",
      roleName: "Administrator",
    });
  });

  it("falls back to raw value if no mapping exists", () => {
    const result = resolveDisplayNames(displayNameMap, {
      platform: "desktop",
    });
    expect(result).toEqual({ platformName: "desktop" });
  });

  it("skips non-string attribute values", () => {
    const result = resolveDisplayNames(displayNameMap, {
      platform: 123,
    });
    expect(result).toEqual({});
  });

  it("returns empty object when no attributes match", () => {
    const result = resolveDisplayNames(displayNameMap, {
      unrelatedField: "value",
    });
    expect(result).toEqual({});
  });

  it("handles empty inputs", () => {
    expect(resolveDisplayNames({}, {})).toEqual({});
    expect(resolveDisplayNames(displayNameMap, {})).toEqual({});
  });
});
