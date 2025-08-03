import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
import { canvasFetch } from "./client.js";

// Schemas

export const assignmentSchema = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  due_at: Type.Optional(Type.String({ format: "date-time" })),
  points_possible: Type.Optional(Type.Number()),
  course_id: Type.Integer(),
});

export const assignmentListParamsSchema = Type.Object({
  course_id: Type.Integer({ description: "The ID of the course." }),
});

export const assignmentListResultSchema = Type.Array(assignmentSchema);

export const assignmentCreateParamsSchema = Type.Object({
  course_id: Type.Integer({ description: "The ID of the course." }),
  name: Type.String({ description: "The name of the assignment." }),
  description: Type.Optional(
    Type.String({ description: "A description of the assignment." }),
  ),
  due_at: Type.Optional(
    Type.String({
      format: "date-time",
      description: "The due date for the assignment.",
    }),
  ),
  points_possible: Type.Optional(
    Type.Number({ description: "The maximum points possible." }),
  ),
});

export const assignmentCreateResultSchema = assignmentSchema;

// Types

export type Assignment = Static<typeof assignmentSchema>;
export type AssignmentListParams = Static<typeof assignmentListParamsSchema>;
export type AssignmentListResult = Static<typeof assignmentListResultSchema>;
export type AssignmentCreateParams = Static<
  typeof assignmentCreateParamsSchema
>;
export type AssignmentCreateResult = Static<
  typeof assignmentCreateResultSchema
>;

// Capabilities

export async function assignmentList(
  params: AssignmentListParams,
  ctx: ExecutionContext,
): Promise<AssignmentListResult> {
  return canvasFetch<AssignmentListResult>(
    ctx,
    `/courses/${params.course_id}/assignments`,
  );
}

export async function assignmentCreate(
  params: AssignmentCreateParams,
  ctx: ExecutionContext,
): Promise<AssignmentCreateResult> {
  const body = {
    assignment: {
      name: params.name,
      description: params.description,
      due_at: params.due_at,
      points_possible: params.points_possible,
    },
  };
  return canvasFetch<AssignmentCreateResult>(
    ctx,
    `/courses/${params.course_id}/assignments`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}
