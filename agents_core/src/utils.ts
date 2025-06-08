import { TypeCompiler } from "@sinclair/typebox/compiler";
import { TSchema } from "@sinclair/typebox";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { PromptTemplate } from "@langchain/core/prompts";


export function validateInput(schema: TSchema, data: unknown) {
  const result = TypeCompiler.Compile(schema).Check(data);
  if (!result) throw new Error(`Invalid params: ${JSON.stringify(data)}`);
}

export function loadPrompt(promptName: string, version: string): PromptTemplate {
  const prompt = new PromptTemplate({
    template: "",
    inputVariables: [],
  });

    try {
      const __dirname = import.meta.dirname;
      const promptsDir = __dirname;
      const yamlFiles = fs
        .readdirSync(promptsDir)
        .filter((file) => file.endsWith(".yaml"));

      for (const file of yamlFiles) {
        const filePath = path.join(promptsDir, file);
        const fileContent = fs.readFileSync(filePath, "utf8");
        const promptData = yaml.parse(fileContent);

        if (promptData.name === promptName && promptData.version === version) {
          prompt.template = promptData.content;
          prompt.inputVariables = promptData.variables;
          return prompt;
        }
      }

    } catch (error) {
      console.error("Error loading prompts from YAML files:", error);
      throw error;
  }
  return prompt;
}