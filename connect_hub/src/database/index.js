import * as schema from "./schema.js";
import * as relations from "./relations.js";
const schemaAndRelations = { ...schema, ...relations };

export * from "./schema.js";
export * from "./relations.js";
export { schemaAndRelations };