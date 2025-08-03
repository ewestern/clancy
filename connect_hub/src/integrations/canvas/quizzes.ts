import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
import { canvasFetch } from "./client.js";

// Schemas

export const quizSchema = Type.Object({
  id: Type.Integer(),
  title: Type.String(),
  html_url: Type.String(),
  points_possible: Type.Optional(Type.Number()),
  due_at: Type.Optional(Type.String({ format: "date-time" })),
  course_id: Type.Integer(),
});

export const quizCreateParamsSchema = Type.Object({
  course_id: Type.Integer({ description: "The ID of the course." }),
  title: Type.String({ description: "The title of the quiz." }),
  description: Type.Optional(
    Type.String({ description: "A description of the quiz." }),
  ),
  due_at: Type.Optional(
    Type.String({
      format: "date-time",
      description: "The due date for the quiz.",
    }),
  ),
  points_possible: Type.Optional(
    Type.Number({ description: "The maximum points possible." }),
  ),
});

export const quizCreateResultSchema = quizSchema;

// Types

export type Quiz = Static<typeof quizSchema>;
export type QuizCreateParams = Static<typeof quizCreateParamsSchema>;
export type QuizCreateResult = Static<typeof quizCreateResultSchema>;

// Capabilities

export async function quizCreate(
  params: QuizCreateParams,
  ctx: ExecutionContext,
): Promise<QuizCreateResult> {
  const body = {
    quiz: {
      title: params.title,
      description: params.description,
      due_at: params.due_at,
      points_possible: params.points_possible,
    },
  };
  return canvasFetch<QuizCreateResult>(
    ctx,
    `/courses/${params.course_id}/quizzes`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );
}
