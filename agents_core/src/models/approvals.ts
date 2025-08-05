import { Type } from "@sinclair/typebox";
import { ErrorSchema, StringEnum, TDate } from "./shared.js";
import { Ref } from "./shared.js";

export enum ApprovalRequestStatus {
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
}

export const ApprovalRequestStatusSchema = StringEnum([
  ApprovalRequestStatus.Pending,
  ApprovalRequestStatus.Approved,
  ApprovalRequestStatus.Rejected,
]);

export const ApprovalRequestSchema = Type.Object(
  {
    id: Type.ReadonlyOptional(
      Type.String({
        readOnly: true,
      }),
    ),
    agentId: Type.String(),
    runId: Type.String(),
    status: Type.Optional(ApprovalRequestStatusSchema),
    summary: Type.String(),
    modifications: Type.Any(),
    capability: Type.String(),
    request: Type.Any(),
    createdAt: Type.ReadonlyOptional(
      TDate({
        readOnly: true,
      }),
    ),
    updatedAt: Type.ReadonlyOptional(
      TDate({
        readOnly: true,
      }),
    ),
  },
  {
    $id: "ApprovalRequest",
  },
);

export const GetApprovalRequestsEndpoint = {
  tags: ["Approvals"],
  summary: "Get approval requests",
  description: "Get approval requests",
  security: [{ bearerAuth: [] }],
  querystring: Type.Object({
    status: Type.Optional(ApprovalRequestStatusSchema),
  }),
  response: {
    200: Type.Array(Ref(ApprovalRequestSchema)),
    404: ErrorSchema,
  },
};
export const GetApprovalRequestEndpoint = {
  tags: ["Approvals"],
  summary: "Get an approval request",
  description: "Get an approval request by ID",
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    id: Type.String(),
  }),
  response: {
    200: Ref(ApprovalRequestSchema),
    404: ErrorSchema,
  },
};

export const CreateApprovalRequestEndpoint = {
  tags: ["Approvals"],
  summary: "Create an approval request",
  description: "Create an approval request",
  security: [{ bearerAuth: [] }],
  body: Ref(ApprovalRequestSchema),
  response: {
    200: Ref(ApprovalRequestSchema),
    400: ErrorSchema,
  },
};

export const UpdateApprovalRequestEndpoint = {
  tags: ["Approvals"],
  summary: "Update an approval request",
  description: "Update an approval request",
  security: [{ bearerAuth: [] }],
  params: Type.Object({
    id: Type.String(),
  }),
  body: Type.Partial(
    Type.Object({
      status: Type.Optional(ApprovalRequestStatusSchema),
      modifications: Type.Optional(Type.Object({})),
    }),
  ),
  response: {
    200: Ref(ApprovalRequestSchema),
    400: ErrorSchema,
  },
};
