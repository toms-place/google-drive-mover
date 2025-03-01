import { google, Auth } from "googleapis";
import keys from "../oauth2.keys.json";
import { tokenCodeEmitter } from "server";
import opn from "opn";

const scopes = ["https://www.googleapis.com/auth/drive"];

class OAuth2ClientManager {
  private clients: Map<string, Auth.OAuth2Client>;
  private scopes: string[];
  private waitingForAuth: boolean = true;

  constructor(scopes: string[]) {
    this.clients = new Map();
    this.scopes = scopes;
    tokenCodeEmitter.on(
      "code",
      async (params: { code: string; state: string }) => {
        const tokens = await this.authenticate(params.state, params.code);
        console.log("Received tokens for:", params.state);
        this.waitingForAuth = false;
      }
    );
  }

  async createClient(userId: string) {
    this.waitingForAuth = true;
    const oauth2Client: Auth.OAuth2Client = new google.auth.OAuth2(
      keys.web.client_id,
      keys.web.client_secret,
      keys.web.redirect_uris[0]
    );
    this.clients.set(userId, oauth2Client);

    console.log(`Authorize for: ${userId}`);
    opn(this.getAuthorizeUrl(userId, this.scopes));
    while (this.waitingForAuth) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return oauth2Client;
  }

  getClient(userId: string) {
    return this.clients.get(userId);
  }

  getAuthorizeUrl(userId: string, scopes: string[]) {
    const oauth2Client = this.getClient(userId);
    if (!oauth2Client) {
      throw new Error("OAuth2 client not found for user");
    }
    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes.join(" "),
      state: userId,
      prompt: "select_account",
      login_hint: userId,
    });
  }

  async authenticate(userId: string, code: string) {
    const oauth2Client = this.getClient(userId);
    if (!oauth2Client) {
      throw new Error("OAuth2 client not found for user");
    }
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.credentials = tokens;
    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    return tokens;
  }
}

export const clientManager = new OAuth2ClientManager(scopes);
