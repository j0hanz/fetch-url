import { describe, expect, it } from "vitest";
import { getFetchUrlTransportConfig } from "@/lib/mcp";

describe("getFetchUrlTransportConfig", () => {
  it("launches the fetch-url MCP entrypoint through the current Node binary", () => {
    const transport = getFetchUrlTransportConfig(
      (specifier) => `/var/task/node_modules/${specifier}/dist/index.js`,
    );

    expect(transport.command).toBe(process.execPath);
    expect(transport.args).toEqual([
      "/var/task/node_modules/@j0hanz/fetch-url-mcp/dist/index.js",
    ]);
  });
});
