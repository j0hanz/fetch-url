import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export interface FetchUrlArgs {
  url: string;
  skipNoiseRemoval?: boolean;
  forceRefresh?: boolean;
  maxInlineChars?: number;
}

export async function callFetchUrl(
  args: FetchUrlArgs,
): Promise<CallToolResult> {
  const client = new Client({ name: "page-converter", version: "1.0.0" });

  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", "@j0hanz/fetch-url-mcp@latest"],
  });

  client.onerror = (error) => {
    console.error("[MCP client error]", error);
  };

  try {
    await client.connect(transport);

    const toolArgs: Record<string, unknown> = { url: args.url };
    if (args.skipNoiseRemoval !== undefined)
      toolArgs.skipNoiseRemoval = args.skipNoiseRemoval;
    if (args.forceRefresh !== undefined)
      toolArgs.forceRefresh = args.forceRefresh;
    if (args.maxInlineChars !== undefined)
      toolArgs.maxInlineChars = args.maxInlineChars;

    const result = await client.callTool({
      name: "fetch-url",
      arguments: toolArgs,
    });

    return result as CallToolResult;
  } finally {
    try {
      await client.close();
    } catch {
      // Ignore close errors
    }
  }
}
