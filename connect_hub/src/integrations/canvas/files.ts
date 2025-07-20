import { Type, Static } from "@sinclair/typebox";
import { ExecutionContext } from "../../providers/types.js";
import { canvasFetch } from "./client.js";
import { fileFromBase64 } from "../../providers/utils.js";

// Schemas

export const fileUploadParamsSchema = Type.Object({
  course_id: Type.Integer({ description: "The ID of the course." }),
  parent_folder_path: Type.String({
    description: "The path of the folder to upload the file to.",
    default: "unfiled",
  }),
  file_name: Type.String({ description: "The name of the file." }),
  file_content_base64: Type.String({
    description: "The base64 encoded content of the file.",
    format: "byte",
  }),
  content_type: Type.String({ description: "The MIME type of the file." }),
});

export const fileUploadResultSchema = Type.Object({
  id: Type.Integer(),
  url: Type.String(),
  "upload-url": Type.String(),
});

// Types

export type FileUploadParams = Static<typeof fileUploadParamsSchema>;
export type FileUploadResult = Static<typeof fileUploadResultSchema>;

// Capabilities

export async function fileUpload(
  params: FileUploadParams,
  ctx: ExecutionContext,
): Promise<FileUploadResult> {
  // Step 1: Request an upload URL from Canvas
  const getUploadUrlBody = {
    name: params.file_name,
    parent_folder_path: params.parent_folder_path,
    content_type: params.content_type,
  };

  const uploadUrlResponse = await canvasFetch<{
    upload_url: string;
    upload_params: Record<string, string>;
  }>(ctx, `/courses/${params.course_id}/files`, {
    method: "POST",
    body: JSON.stringify(getUploadUrlBody),
  });

  // Step 2: Upload the file to the returned URL
  const file = await fileFromBase64(
    params.file_content_base64,
    params.content_type,
    params.file_name,
  );
  const formData = new FormData();
  for (const [key, value] of Object.entries(uploadUrlResponse.upload_params)) {
    formData.append(key, value);
  }
  formData.append("file", file);

  const uploadResponse = await fetch(uploadUrlResponse.upload_url, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text();
    throw new Error(
      `File upload failed with status ${uploadResponse.status}: ${errorBody}`,
    );
  }

  return uploadResponse.json() as Promise<FileUploadResult>;
}
