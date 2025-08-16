import { TypeCompiler } from "@sinclair/typebox/compiler";
import { TSchema, TypeGuard } from "@sinclair/typebox";
import { Symbol } from "@sinclair/typebox";

export function schemaToJson(schema: TSchema) {
  return JSON.stringify(schema, null, 2); // 1) for prompt injection
}

export function validateInput(schema: TSchema, data: unknown) {
  const result = TypeCompiler.Compile(schema).Check(data);
  if (!result) throw new Error(`Invalid params: ${JSON.stringify(data)}`);
}

/**
 * Converts a base64 encoded string to a File object.
 *
 * @param base64 - The base64 encoded string.
 * @param contentType - The MIME type of the file.
 * @param fileName - The name of the file.
 * @returns A Promise that resolves to a File object.
 */
export async function fileFromBase64(
  base64: string,
  contentType: string,
  fileName: string,
): Promise<File> {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: contentType });
  return new File([blob], fileName, { type: contentType });
}
