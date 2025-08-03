import {
  KinesisClient,
  PutRecordCommand,
  PutRecordsCommand,
} from "@aws-sdk/client-kinesis";

export async function publishEvents(
  events: { event: Record<string, unknown>; partitionKey: string }[],
) {
  const kinesisClient = new KinesisClient({
    region: process.env.AWS_REGION!,
    profile: process.env.AWS_PROFILE!,
  });
  const command = new PutRecordsCommand({
    Records: events.map((e) => ({
      Data: Buffer.from(JSON.stringify(e.event)),
      PartitionKey: e.partitionKey,
    })),
    StreamName: process.env.KINESIS_STREAM_NAME,
  });
  await kinesisClient.send(command);
}
