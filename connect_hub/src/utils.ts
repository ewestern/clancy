import {
  KinesisClient,
  PutRecordCommand,
  PutRecordsCommand,
} from "@aws-sdk/client-kinesis";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);

export function getCurrentTimestamp() {
  return dayjs().utc().format();
}

export async function publishEvents(
  events: { event: Record<string, unknown>; partitionKey: string }[],
) {
  if (events.length === 0) {
    return;
  }
  const kinesisClient = new KinesisClient({
    region: process.env.AWS_REGION!,
  });
  let eventsWithTimestamp = events.map((e) => ({
    ...e,
    event: {
      ...e.event,
      timestamp: getCurrentTimestamp(),
    },
  }));
  const command = new PutRecordsCommand({
    Records: eventsWithTimestamp.map((e) => ({
      Data: Buffer.from(JSON.stringify(e.event)),
      PartitionKey: e.partitionKey,
    })),
    StreamName: process.env.KINESIS_STREAM_NAME,
  });
  await kinesisClient.send(command);
}
