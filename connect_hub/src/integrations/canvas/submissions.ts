import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
import { canvasFetch } from "./client.js";

// Schemas

export const submissionSchema = Type.Object({
  id: Type.Integer(),
  assignment_id: Type.Integer(),
  user_id: Type.Integer(),
  grade: Type.Optional(Type.String()),
  score: Type.Optional(Type.Number()),
  submitted_at: Type.Optional(Type.String({ format: "date-time" })),
  workflow_state: Type.String(),
});

export const submissionListParamsSchema = Type.Object({
  course_id: Type.Integer({ description: "The ID of the course." }),
  assignment_id: Type.Integer({ description: "The ID of the assignment." }),
});

export const submissionListResultSchema = Type.Array(submissionSchema);

export const submissionGradeParamsSchema = Type.Object({
  course_id: Type.Integer({ description: "The ID of the course." }),
  assignment_id: Type.Integer({ description: "The ID of the assignment." }),
  user_id: Type.Integer({ description: "The ID of the user." }),
  grade: Type.String({ description: "The grade to assign." }),
});

export const submissionGradeResultSchema = submissionSchema;

// Types

export type Submission = Static<typeof submissionSchema>;
export type SubmissionListParams = Static<typeof submissionListParamsSchema>;
export type SubmissionListResult = Static<typeof submissionListResultSchema>;
export type SubmissionGradeParams = Static<typeof submissionGradeParamsSchema>;
export type SubmissionGradeResult = Static<typeof submissionGradeResultSchema>;

// Capabilities

export async function submissionList(
  params: SubmissionListParams,
  ctx: ExecutionContext,
): Promise<SubmissionListResult> {
  return canvasFetch<SubmissionListResult>(
    ctx,
    `/courses/${params.course_id}/assignments/${params.assignment_id}/submissions`,
  );
}

export async function submissionGrade(
  params: SubmissionGradeParams,
  ctx: ExecutionContext,
): Promise<SubmissionGradeResult> {
  const body = {
    submission: {
      posted_grade: params.grade,
    },
  };

  return canvasFetch<SubmissionGradeResult>(
    ctx,
    `/courses/${params.course_id}/assignments/${params.assignment_id}/submissions/${params.user_id}`,
    {
      method: "PUT",
      body: JSON.stringify(body),
    },
  );
}
