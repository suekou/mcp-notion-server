/**
 * Streamable HTTP transport with OAuth 2.0 for MCP server.
 * Enables hosting the server remotely for Claude custom connectors.
 */

import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import type { OAuthServerProvider, AuthorizationParams } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
  OAuthTokenRevocationRequest,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { createConfiguredServer } from "./index.js";

// --- In-memory OAuth stores ---

interface StoredAuthCode {
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  expiresAt: number;
}

interface StoredAccessToken {
  clientId: string;
  scopes: string[];
  expiresAt: number;
}

interface StoredRefreshToken {
  clientId: string;
  scopes: string[];
}

// --- OAuth Provider implementation ---

class InMemoryOAuthProvider implements OAuthServerProvider {
  private authCodes = new Map<string, StoredAuthCode>();
  private accessTokens = new Map<string, StoredAccessToken>();
  private refreshTokens = new Map<string, StoredRefreshToken>();
  private registeredClients = new Map<string, OAuthClientInformationFull>();

  clientsStore: OAuthRegisteredClientsStore;

  constructor(
    private preConfiguredClientId?: string,
    private preConfiguredClientSecret?: string
  ) {
    const self = this;
    this.clientsStore = {
      getClient(clientId: string): OAuthClientInformationFull | undefined {
        // Check pre-configured client
        if (
          self.preConfiguredClientId &&
          clientId === self.preConfiguredClientId
        ) {
          return {
            client_id: self.preConfiguredClientId,
            client_secret: self.preConfiguredClientSecret,
            redirect_uris: [
              "https://claude.ai/api/mcp/auth_callback",
              "https://claude.com/api/mcp/auth_callback",
              "http://localhost/callback",
              "http://localhost:3000/callback",
            ],
          };
        }
        // Check dynamically registered clients
        return self.registeredClients.get(clientId);
      },

      registerClient(
        client: OAuthClientInformationFull
      ): OAuthClientInformationFull {
        self.registeredClients.set(client.client_id, client);
        return client;
      },
    };
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    // Render a simple consent page
    const code = randomUUID();
    // We'll store the code when the user approves (via POST /approve)
    // For now, render the form with the code embedded
    res.setHeader("Content-Type", "text/html");
    res.end(`<!DOCTYPE html>
<html>
<head>
  <title>Authorize MCP Server</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 480px; margin: 80px auto; padding: 0 20px; }
    h1 { font-size: 1.4em; }
    .btn { display: inline-block; padding: 12px 24px; border: none; border-radius: 6px;
           font-size: 1em; cursor: pointer; text-decoration: none; }
    .approve { background: #2563eb; color: white; }
    .approve:hover { background: #1d4ed8; }
    .info { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>Authorize Claude</h1>
  <div class="info">
    <p><strong>${client.client_name || client.client_id}</strong> wants to access your Notion MCP Server.</p>
  </div>
  <form method="POST" action="/approve">
    <input type="hidden" name="code" value="${code}" />
    <input type="hidden" name="clientId" value="${client.client_id}" />
    <input type="hidden" name="codeChallenge" value="${params.codeChallenge}" />
    <input type="hidden" name="redirectUri" value="${params.redirectUri}" />
    <input type="hidden" name="state" value="${params.state || ""}" />
    <button type="submit" class="btn approve">Approve</button>
  </form>
</body>
</html>`);
  }

  storeAuthCode(
    code: string,
    clientId: string,
    codeChallenge: string,
    redirectUri: string
  ): void {
    this.authCodes.set(code, {
      clientId,
      codeChallenge,
      redirectUri,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const stored = this.authCodes.get(authorizationCode);
    if (!stored || stored.expiresAt < Date.now()) {
      throw new Error("Invalid or expired authorization code");
    }
    return stored.codeChallenge;
  }

  async exchangeAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<OAuthTokens> {
    const stored = this.authCodes.get(authorizationCode);
    if (!stored || stored.expiresAt < Date.now()) {
      throw new Error("Invalid or expired authorization code");
    }
    this.authCodes.delete(authorizationCode);

    const accessToken = randomUUID();
    const refreshToken = randomUUID();

    this.accessTokens.set(accessToken, {
      clientId: stored.clientId,
      scopes: [],
      expiresAt: Date.now() + 3600 * 1000, // 1 hour
    });

    this.refreshTokens.set(refreshToken, {
      clientId: stored.clientId,
      scopes: [],
    });

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refreshToken,
    };
  }

  async exchangeRefreshToken(
    _client: OAuthClientInformationFull,
    refreshToken: string
  ): Promise<OAuthTokens> {
    const stored = this.refreshTokens.get(refreshToken);
    if (!stored) {
      throw new Error("Invalid refresh token");
    }

    const newAccessToken = randomUUID();
    const newRefreshToken = randomUUID();

    this.accessTokens.set(newAccessToken, {
      clientId: stored.clientId,
      scopes: stored.scopes,
      expiresAt: Date.now() + 3600 * 1000,
    });

    // Rotate refresh token
    this.refreshTokens.delete(refreshToken);
    this.refreshTokens.set(newRefreshToken, {
      clientId: stored.clientId,
      scopes: stored.scopes,
    });

    return {
      access_token: newAccessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: newRefreshToken,
    };
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const stored = this.accessTokens.get(token);
    if (!stored) {
      throw new Error("Invalid access token");
    }
    if (stored.expiresAt < Date.now()) {
      this.accessTokens.delete(token);
      throw new Error("Token has expired");
    }
    return {
      token,
      clientId: stored.clientId,
      scopes: stored.scopes,
      expiresAt: Math.floor(stored.expiresAt / 1000),
    };
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest
  ): Promise<void> {
    this.accessTokens.delete(request.token);
    this.refreshTokens.delete(request.token);
  }
}

// --- HTTP Server ---

export async function startHttpServer(
  notionToken: string,
  enabledToolsSet: Set<string>,
  enableMarkdownConversion: boolean,
  port: number,
  oauthClientId?: string,
  oauthClientSecret?: string
): Promise<void> {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const provider = new InMemoryOAuthProvider(oauthClientId, oauthClientSecret);

  const app = express();

  // Trust loopback proxy (cloudflared runs locally and sets X-Forwarded-Proto: https)
  app.set("trust proxy", "loopback");

  // Log all requests for debugging
  app.use((req, _res, next) => {
    console.error(`${req.method} ${req.path} (proto=${req.protocol}, host=${req.get("host")})`);
    next();
  });

  // RFC 9728 Protected Resource Metadata — tells Claude where the auth server is
  app.get("/.well-known/oauth-protected-resource", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.json({
      resource: baseUrl,
      authorization_servers: [baseUrl],
      bearer_methods_supported: ["header"],
    });
  });

  // Dynamic OAuth metadata — serves the public URL (from the tunnel) instead of localhost
  app.get("/.well-known/oauth-authorization-server", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/authorize`,
      token_endpoint: `${baseUrl}/token`,
      registration_endpoint: `${baseUrl}/register`,
      revocation_endpoint: `${baseUrl}/revoke`,
      response_types_supported: ["code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["client_secret_post"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      revocation_endpoint_auth_methods_supported: ["client_secret_post"],
    });
  });

  // Mount OAuth router (handles /authorize, /token, /register, /revoke)
  // Metadata endpoints above take precedence over the router's static ones
  const issuerUrl = new URL(`http://localhost:${port}`);
  app.use(
    mcpAuthRouter({
      provider,
      issuerUrl,
    })
  );

  // Handle approval form submission from the consent page
  app.post("/approve", express.urlencoded({ extended: false }), (req, res) => {
    const { code, clientId, codeChallenge, redirectUri, state } = req.body;

    provider.storeAuthCode(code, clientId, codeChallenge, redirectUri);

    // Redirect back to Claude with the authorization code
    const redirectUrl = new URL(redirectUri);
    redirectUrl.searchParams.set("code", code);
    if (state) {
      redirectUrl.searchParams.set("state", state);
    }
    res.redirect(redirectUrl.toString());
  });

  // Bearer auth middleware for MCP endpoints
  const bearerAuth = requireBearerAuth({ provider });

  // MCP handlers
  async function handleMcpPost(req: Request, res: Response) {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && transports.has(sessionId)) {
      const transport = transports.get(sessionId)!;
      await transport.handleRequest(req, res, req.body);
    } else if (!sessionId && isInitializeRequest(req.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sid: string) => {
          console.error(`Session initialized: ${sid}`);
          transports.set(sid, transport);
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports.has(sid)) {
          console.error(`Session closed: ${sid}`);
          transports.delete(sid);
        }
      };

      const server = createConfiguredServer(
        notionToken,
        enabledToolsSet,
        enableMarkdownConversion
      );
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
    }
  }

  async function handleMcpSession(req: Request, res: Response) {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Invalid or missing session ID" },
        id: null,
      });
      return;
    }
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
  }

  // Mount MCP on both / and /mcp (Claude may use either)
  for (const path of ["/", "/mcp"]) {
    app.post(path, express.json(), bearerAuth, handleMcpPost);
    app.get(path, bearerAuth, handleMcpSession);
    app.delete(path, bearerAuth, handleMcpSession);
  }

  const httpServer = app.listen(port, () => {
    console.error(`MCP Streamable HTTP Server listening on port ${port}`);
    console.error(`Endpoint: http://localhost:${port}/mcp`);
    console.error(
      `OAuth metadata: http://localhost:${port}/.well-known/oauth-authorization-server`
    );
    if (oauthClientId) {
      console.error(`OAuth Client ID: ${oauthClientId}`);
    }
  });

  process.on("SIGINT", async () => {
    console.error("Shutting down...");
    for (const [sid, transport] of transports) {
      try {
        await transport.close();
      } catch (e) {
        console.error(`Error closing session ${sid}:`, e);
      }
    }
    transports.clear();
    httpServer.close();
    process.exit(0);
  });
}
