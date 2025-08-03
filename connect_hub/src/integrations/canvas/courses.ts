import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
import { canvasFetch } from "./client.js";

// Schemas

export const courseSchema = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  course_code: Type.Optional(Type.String()),
  workflow_state: Type.String(),
  start_at: Type.Optional(Type.String({ format: "date-time" })),
  end_at: Type.Optional(Type.String({ format: "date-time" })),
});

export const courseListParamsSchema = Type.Object({});

export const courseListResultSchema = Type.Array(courseSchema);

export const courseEnrollUserParamsSchema = Type.Object({
  course_id: Type.Integer({ description: "The ID of the course." }),
  user_id: Type.Integer({ description: "The ID of the user to enroll." }),
  enrollment_type: Type.Union(
    [
      Type.Literal("StudentEnrollment"),
      Type.Literal("TeacherEnrollment"),
      Type.Literal("TaEnrollment"),
      Type.Literal("ObserverEnrollment"),
      Type.Literal("DesignerEnrollment"),
    ],
    { description: "The type of enrollment." },
  ),
});

export const courseEnrollUserResultSchema = Type.Object({
  id: Type.Integer(),
  course_id: Type.Integer(),
  user_id: Type.Integer(),
  type: Type.String(),
  workflow_state: Type.String(),
});

// Types

export type Course = Static<typeof courseSchema>;
export type CourseListParams = Static<typeof courseListParamsSchema>;
export type CourseListResult = Static<typeof courseListResultSchema>;
export type CourseEnrollUserParams = Static<
  typeof courseEnrollUserParamsSchema
>;
export type CourseEnrollUserResult = Static<
  typeof courseEnrollUserResultSchema
>;

// Capabilities

export async function courseList(
  _params: CourseListParams,
  ctx: ExecutionContext,
): Promise<CourseListResult> {
  return canvasFetch<CourseListResult>(ctx, "/courses");
}

export async function courseEnrollUser(
  params: CourseEnrollUserParams,
  ctx: ExecutionContext,
): Promise<CourseEnrollUserResult> {
  const body = {
    enrollment: {
      user_id: params.user_id,
      type: params.enrollment_type,
    },
  };

  return canvasFetch<CourseEnrollUserResult>(
    ctx,
    `/courses/${params.course_id}/enrollments`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}
