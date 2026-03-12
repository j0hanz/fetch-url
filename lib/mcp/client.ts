import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  CallToolResult,
  Progress,
} from "@modelcontextprotocol/sdk/types.js";
import path from "node:path";

export interface FetchUrlArgs {
  url: string;
}

const CLIENT_INFO = { name: "page-converter", version: "1.0.0" };
const FETCH_URL_TOOL_NAME = "fetch-url";
const FETCH_URL_TRANSPORT_COMMAND = getFetchUrlTransportCommand();
const FETCH_URL_TRANSPORT_ARGS: string[] = [];

export type ProgressCallback = (progress: Progress) => void;

interface McpInstance {
  client: Client;
  transport: StdioClientTransport;
}

const globalForMcp = globalThis as unknown as {
  __mcpInstance?: McpInstance;
  __mcpConnecting?: Promise<Client>;
};

function createTransport() {
  return new StdioClientTransport({
    command: FETCH_URL_TRANSPORT_COMMAND,
    args: FETCH_URL_TRANSPORT_ARGS,
  });
}

function resetInstance() {
  globalForMcp.__mcpInstance = undefined;
  globalForMcp.__mcpConnecting = undefined;
}

function createClient(): Client {
  const client = new Client(CLIENT_INFO);

  client.onerror = () => {
    resetInstance();
  };

  client.onclose = () => {
    resetInstance();
  };

  return client;
}

async function getConnectedClient(): Promise<Client> {
  if (globalForMcp.__mcpInstance) {
    return globalForMcp.__mcpInstance.client;
  }

  if (globalForMcp.__mcpConnecting) {
    return globalForMcp.__mcpConnecting;
  }

  globalForMcp.__mcpConnecting = (async () => {
    const client = createClient();
    const transport = createTransport();

    await client.connect(transport);

    globalForMcp.__mcpInstance = { client, transport };
    globalForMcp.__mcpConnecting = undefined;

    return client;
  })();

  return globalForMcp.__mcpConnecting;
}

function createProgressOptions(onProgress?: ProgressCallback) {
  return onProgress ? { onprogress: onProgress } : undefined;
}

export async function callFetchUrl(
  args: FetchUrlArgs,
  onProgress?: ProgressCallback,
): Promise<CallToolResult> {
  const client = await getConnectedClient();

  const result = await client.callTool(
    {
      name: FETCH_URL_TOOL_NAME,
      arguments: { url: args.url },
    },
    undefined,
    createProgressOptions(onProgress),
  );

  return result as CallToolResult;
}

function getFetchUrlTransportCommand(): string {
  return path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "fetch-url-mcp.cmd" : "fetch-url-mcp",
  );
}
