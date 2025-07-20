import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
import { canvasFetch } from "./client.js";

// Schemas

export const announcementSchema = Type.Object({
  id: Type.Integer(),
  title: Type.String(),
  message: Type.String(),
  url: Type.String(),
  posted_at: Type.String({ format: "date-time" }),
});

export const announcementCreateParamsSchema = Type.Object({
  course_id: Type.Integer({
    description: "The ID of the course to create the announcement in.",
  }),
  title: Type.String({ description: "The title of the announcement." }),
  message: Type.String({
    description: "The message body of the announcement.",
  }),
});

export const announcementCreateResultSchema = announcementSchema;

// Types

export type Announcement = Static<typeof announcementSchema>;
export type AnnouncementCreateParams = Static<
  typeof announcementCreateParamsSchema
>;
export type AnnouncementCreateResult = Static<
  typeof announcementCreateResultSchema
>;

// Capabilities

export async function announcementCreate(
  params: AnnouncementCreateParams,
  ctx: ExecutionContext,
): Promise<AnnouncementCreateResult> {
  const body = {
    title: params.title,
    message: params.message,
  };

  return canvasFetch<AnnouncementCreateResult>(
    ctx,
    `/courses/${params.course_id}/discussion_topics`,
    {
      method: "POST",
      body: JSON.stringify({ ...body, is_announcement: true }),
    },
  );
}
