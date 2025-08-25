/*
  Cognito Pre Token Generation Lambda for M2M (client_credentials):
  - Expects aws_client_metadata to include { org_id: string }
  - Injects org_id into access token claims
*/

type PreTokenGenerationEvent = {
  version: string;
  triggerSource: string;
  region: string;
  userPoolId: string;
  userName?: string;
  callerContext: Record<string, unknown>;
  request: {
    clientId: string;
    userAttributes: Record<string, string>;
    groupConfiguration?: Record<string, unknown>;
    // For client_credentials, Cognito passes through the aws_client_metadata param as clientMetadata
    clientMetadata?: Record<string, string> | undefined;
  };
  response: {
    claimsOverrideDetails?: {
      claimsToAddOrOverride?: Record<string, string>;
    };
  };
};

type PreTokenGenerationResult = PreTokenGenerationEvent;

export async function handler(
  event: PreTokenGenerationEvent
): Promise<PreTokenGenerationResult> {
  const clientMetadata = event.request.clientMetadata || {};
  const orgId = clientMetadata["org_id"];

  if (orgId) {
    event.response.claimsOverrideDetails =
      event.response.claimsOverrideDetails || {};
    event.response.claimsOverrideDetails.claimsToAddOrOverride = {
      ...(event.response.claimsOverrideDetails.claimsToAddOrOverride || {}),
      org_id: orgId,
    };
  }

  return event;
}
