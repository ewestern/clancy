import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
import { canvasFetch } from "./client.js";

// Schemas

export const enrollmentSchema = Type.Object({
  id: Type.Integer(),
  course_id: Type.Integer(),
  user_id: Type.Integer(),
  type: Type.String(),
  role: Type.String(),
  workflow_state: Type.String(),
  user: Type.Object({
    id: Type.Integer(),
    name: Type.String(),
  }),
});

export const enrollmentListParamsSchema = Type.Object({
  course_id: Type.Integer({ description: "The ID of the course." }),
});

export const enrollmentListResultSchema = Type.Array(enrollmentSchema);

// Types

export type Enrollment = Static<typeof enrollmentSchema>;
export type EnrollmentListParams = Static<typeof enrollmentListParamsSchema>;
export type EnrollmentListResult = Static<typeof enrollmentListResultSchema>;

// Capabilities

export async function enrollmentList(
  params: EnrollmentListParams,
  ctx: ExecutionContext,
): Promise<EnrollmentListResult> {
  return canvasFetch<EnrollmentListResult>(
    ctx,
    `/courses/${params.course_id}/enrollments`,
  );
}
