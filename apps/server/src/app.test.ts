import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";

describe("server", () => {
  it("creates the Express application", () => {
    expect(createApp()).toBeDefined();
  });
});
