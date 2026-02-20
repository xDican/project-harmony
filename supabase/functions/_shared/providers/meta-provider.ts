/**
 * Meta Cloud API (WhatsApp Business Platform) provider.
 * Sends messages via the Meta Graph API.
 */

import type {
  MessagingProvider,
  SendMessageRequest,
  SendMessageResponse,
} from "../messaging-types.ts";
import { toMetaFormat } from "../phone.ts";

export interface MetaProviderConfig {
  phoneNumberId: string;
  accessToken: string;
  graphVersion?: string;
}

export class MetaProvider implements MessagingProvider {
  readonly name = "meta" as const;
  private config: MetaProviderConfig;

  constructor(config: MetaProviderConfig) {
    this.config = config;
  }

  async sendMessage(
    request: SendMessageRequest,
  ): Promise<SendMessageResponse> {
    const version = this.config.graphVersion || "v21.0";
    const url = `https://graph.facebook.com/${version}/${this.config.phoneNumberId}/messages`;

    let payload: Record<string, unknown>;

    if (request.type === "template" && request.templateName) {
      payload = this.buildTemplatePayload(request);
    } else {
      payload = this.buildTextPayload(request);
    }

    console.log(
      "[meta-provider] Sending to:",
      toMetaFormat(request.to),
      "type:",
      request.type,
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (response.ok && data.messages?.[0]?.id) {
      return {
        ok: true,
        status: "sent",
        providerMessageId: data.messages[0].id,
        provider: "meta",
      };
    }

    return {
      ok: false,
      status: "failed",
      error: data.error?.message || "Unknown Meta API error",
      errorCode: String(data.error?.code || ""),
      provider: "meta",
    };
  }

  private buildTemplatePayload(
    request: SendMessageRequest,
  ): Record<string, unknown> {
    const components: unknown[] = [];

    if (request.templateParams && Object.keys(request.templateParams).length > 0) {
      // Sort keys numerically ("1", "2", "3") to build ordered parameters
      const parameters = Object.keys(request.templateParams)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => ({
          type: "text",
          text: request.templateParams![key],
        }));

      components.push({
        type: "body",
        parameters,
      });
    }

    // Quick reply button payloads — one component per button index
    if (request.buttonPayloads && request.buttonPayloads.length > 0) {
      request.buttonPayloads.forEach((payload, index) => {
        components.push({
          type: "button",
          sub_type: "quick_reply",
          index: String(index),
          parameters: [{ type: "payload", payload }],
        });
      });
    }

    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toMetaFormat(request.to),
      type: "template",
      template: {
        name: request.templateName,
        language: { code: request.templateLanguage || "es" },
        components,
      },
    };
  }

  private buildTextPayload(
    request: SendMessageRequest,
  ): Record<string, unknown> {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: toMetaFormat(request.to),
      type: "text",
      text: { body: request.body || "" },
    };
  }
}
