import { Type, Static } from "@sinclair/typebox";
import {
  Capability,
  ExecutionContext,
} from "../../providers/types.js";
import { CapabilityMeta, CapabilityRisk } from "../../providers/types.js";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const capabilityId = "email.send";

// -----------------------------------------------------------------------------
// Schemas
// -----------------------------------------------------------------------------
export const emailSendParamsSchema = Type.Object({
  to: Type.String({
    format: "email",
    description: "Primary recipient email address",
  }),
  subject: Type.String({ minLength: 1 }),
  text: Type.Optional(Type.String({ description: "Plain-text body" })),
  html: Type.Optional(Type.String({ description: "HTML body" })),
  from: Type.Optional(Type.String({ format: "email" })),
});

export const emailSendResultSchema = Type.Object({
  messageId: Type.String(),
  status: Type.String(),
});

export type EmailSendParams = Static<typeof emailSendParamsSchema>;
export type EmailSendResult = Static<typeof emailSendResultSchema>;

// -----------------------------------------------------------------------------
// Implementation (AWS SES)
// -----------------------------------------------------------------------------
const sesClient = new SESClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

async function executeEmailSend(
  params: EmailSendParams,
  ctx: ExecutionContext,
): Promise<EmailSendResult> {
  const fromAddress = params.from ?? process.env.INTERNAL_EMAIL_FROM;
  if (!fromAddress) {
    throw new Error(
      "Missing 'from' address. Provide params.from or set INTERNAL_EMAIL_FROM env var.",
    );
  }

  if (!params.text && !params.html) {
    throw new Error("Either 'text' or 'html' body must be supplied");
  }

  void ctx;

  const input = {
    Source: fromAddress,
    Destination: { ToAddresses: [params.to] },
    Message: {
      Subject: { Data: params.subject },
      Body: {
        ...(params.text ? { Text: { Data: params.text } } : {}),
        ...(params.html ? { Html: { Data: params.html } } : {}),
      },
    },
  };

  const result = await sesClient.send(new SendEmailCommand(input));

  return {
    messageId: result.MessageId ?? "",
    status: "queued",
  };
}

// -----------------------------------------------------------------------------
// Factory
// -----------------------------------------------------------------------------
export function getEmailSendCapability(): Capability<
  EmailSendParams,
  EmailSendResult
> {
  const meta: CapabilityMeta = {
    id: capabilityId,
    displayName: "Send Email",
    description: "Send an email via AWS SES using Clancy credentials.",
    docsUrl:
      "https://docs.aws.amazon.com/ses/latest/APIReference/API_SendEmail.html",
    paramsSchema: emailSendParamsSchema,
    resultSchema: emailSendResultSchema,
    requiredScopes: [],
    risk: CapabilityRisk.HIGH,
  };

  return {
    meta,
    execute: executeEmailSend,
  };
}
