import { TypeCompiler } from "@sinclair/typebox/compiler";
import { TSchema } from "@sinclair/typebox";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { PromptTemplate } from "@langchain/core/prompts";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import {
  KinesisClient,
  PutRecordCommand,
  PutRecordsCommand,
} from "@aws-sdk/client-kinesis";
import { Event } from "@ewestern/events";

dayjs.extend(utc);

const kinesisClient = new KinesisClient({
  region: process.env.AWS_REGION!,
});

export async function publishToKinesis(
  events: Event[],
  partitionKey: (record: Event) => string,
): Promise<void> {
  const streamName = process.env.KINESIS_STREAM_NAME;
  if (!streamName) {
    throw new Error("KINESIS_STREAM_NAME environment variable not set");
  }

  const records = events.map((record) => {
    const correctedPayload = {
      ...record,
      timestamp: getCurrentTimestamp(),
    };
    const data = new TextEncoder().encode(JSON.stringify(correctedPayload));
    return {
      Data: data,
      PartitionKey: partitionKey(record),
    };
  });

  const command = new PutRecordsCommand({
    StreamName: streamName,
    Records: records,
  });

  try {
    await kinesisClient.send(command);
    console.log(`Published ${records.length} events to Kinesis`);
  } catch (error) {
    console.error("Failed to publish to Kinesis:", error);
    throw error;
  }
}

export function getCurrentTimestamp() {
  return dayjs().utc().format();
}

export function validateInput(schema: TSchema, data: unknown) {
  const result = TypeCompiler.Compile(schema).Check(data);
  if (!result) throw new Error(`Invalid params: ${JSON.stringify(data)}`);
}

export function loadPrompt(
  promptName: string,
  version: string,
): PromptTemplate {
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
