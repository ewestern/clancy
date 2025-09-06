import { Static, Type } from "@sinclair/typebox";
import { ErrorSchema, Ref, StringEnum } from "./shared.js";

export enum TemplateStatus {
  Active = "active",
  Inactive = "inactive",
}

export const TemplateStatusSchema = StringEnum(
  [TemplateStatus.Active, TemplateStatus.Inactive],
  { $id: "TemplateStatus" },
);

export const TemplatePublicSchema = Type.Object(
  {
    id: Type.String(),
    status: Ref(TemplateStatusSchema),
    headline: Type.String(),
    promise: Type.String(),
    category: Type.String(),
    integrations: Type.Array(Type.String()),
    jdSeed: Type.String(),
    icon: Type.String(),
  },
  { $id: "TemplatePublic" },
);

export type TemplatePublic = Static<typeof TemplatePublicSchema>;

export const ListPublicTemplatesEndpoint = {
  tags: ["Templates"],
  summary: "List public templates",
  description: "List templates for landing page and library",
  response: {
    200: Type.Array(TemplatePublicSchema),
  },
};

export const GetPublicTemplateEndpoint = {
  tags: ["Templates"],
  summary: "Get a public template",
  description: "Get a template by id",
  params: Type.Object({ id: Type.String() }),
  response: {
    200: TemplatePublicSchema,
    404: ErrorSchema,
  },
};


