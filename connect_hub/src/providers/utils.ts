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

export function prettyFormat(
  schema: TSchema,
  params: Record<string, unknown>,
  indent = 0,
): string {
  console.log("SCHEMA", schema);
  const pad = (n: number) => " ".repeat(n);
  const lines: string[] = [];
  /* Handle only object types for brevity (extend as needed) */
  if (TypeGuard.IsObject(schema)) {
    const props = schema.properties as Record<string, TSchema>;
    for (const [key, propSchema] of Object.entries(props)) {
      const title = propSchema.title ?? key;
      const value = params[key];
      if (value === undefined) {
        continue;
      }
      console.log("TITLE", title);
      console.log("DESCRIPTION", propSchema.description);
      console.log("VALUE", value);

      /* Primitive fields */
      if (
        TypeGuard.IsString(propSchema) ||
        TypeGuard.IsNumber(propSchema) ||
        TypeGuard.IsBoolean(propSchema) ||
        TypeGuard.IsDate(propSchema) ||
        TypeGuard.IsSymbol(propSchema) ||
        TypeGuard.IsTuple(propSchema)
      ) {
        lines.push(
          `${pad(indent)}- ${title}: ${value}`,
        );
      }

      if (TypeGuard.IsUnion(propSchema)) {
        const union = propSchema.anyOf;
        for (const schema of union) {
          const result = TypeCompiler.Compile(schema).Check(value);
          if (result) {
            lines.push(`${pad(indent)}- ${title}: ${value}`);
            break;
          }
        }
      }

      /* Nested objects – recurse */
      if (TypeGuard.IsObject(propSchema) && typeof value === "object") {
        lines.push(`${pad(indent)}- ${title}:`);
        lines.push(
          prettyFormat(propSchema, value as Record<string, unknown>, indent + 2),
        );
      }

      /* Arrays (simplified) */
      if (TypeGuard.IsArray(propSchema) && Array.isArray(value)) {
        lines.push(`${pad(indent)}- ${title}:`);
        value.forEach((item, i) =>
          lines.push(
            `${pad(indent + 2)}• ${JSON.stringify(item)}`,
          ),
        );
      }
    }
  }
  return lines.join("\n");
}

