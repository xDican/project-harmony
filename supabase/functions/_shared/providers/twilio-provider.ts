/**
 * Twilio provider for WhatsApp messaging.
 * Extracted from send-whatsapp-message/index.ts for the gateway abstraction.
 */

import type {
  MessagingProvider,
  SendMessageRequest,
  SendMessageResponse,
} from "../messaging-types.ts";
import { toTwilioFormat } from "../phone.ts";

export interface TwilioProviderConfig {
  accountSid: string;
  authToken: string;
  from: string; // whatsapp:+504XXXXXXXX
  messagingServiceSid?: string;
}

export class TwilioProvider implements MessagingProvider {
  readonly name = "twilio" as const;
  private config: TwilioProviderConfig;

  constructor(config: TwilioProviderConfig) {
    this.config = config;
  }

  async sendMessage(
    request: SendMessageRequest,
  ): Promise<SendMessageResponse> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`;

    const formData = new URLSearchParams();
    formData.append("To", toTwilioFormat(request.to));
    formData.append("From", this.config.from);

    if (this.config.messagingServiceSid) {
      formData.append("MessagingServiceSid", this.config.messagingServiceSid);
    }

    if (request.type === "template" && request.templateName) {
      // Twilio uses ContentSid for templates
      formData.append("ContentSid", request.templateName);
      if (request.templateParams) {
        formData.append(
          "ContentVariables",
          JSON.stringify(request.templateParams),
        );
      }
    } else if (request.body) {
      formData.append("Body", request.body);
    }

    const credentials = btoa(
      `${this.config.accountSid}:${this.config.authToken}`,
    );

    console.log(
      "[twilio-provider] Sending to:",
      toTwilioFormat(request.to),
      "type:",
      request.type,
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (response.ok) {
      return {
        ok: true,
        status: "sent",
        providerMessageId: data.sid,
        provider: "twilio",
      };
    }

    return {
      ok: false,
      status: "failed",
      error: data.error_message || data.message || "Twilio API error",
      errorCode: String(data.error_code || ""),
      provider: "twilio",
    };
  }
}
