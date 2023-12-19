import { createParser, ParseEvent } from "eventsource-parser";
import { TextDecoderStream } from "node:stream/web";
import { ReadableStream } from "stream/web";
import { z } from "zod";

declare var window: any;

export type InkeepMessage = {
  role: "user" | "assistant";
  content: string;
  [key: string]: any;
};

// Schema for an Inkeep Message Chunk
const InkeepMessageChunkDataSchema = z
  .object({
    chat_session_id: z.string(),
    content_chunk: z.string(),
    finish_reason: z.union([z.string(), z.null()]).optional().nullable(),
  })
  .passthrough();

export type InkeepMessageChunkData = z.infer<
  typeof InkeepMessageChunkDataSchema
>;

const RecordSchema = z
  .object({
    type: z.string(),
    url: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    breadcrumbs: z.array(z.string()).optional().nullable(),
  })
  .passthrough();

const CitationSchema = z
  .object({
    number: z.number(),
    record: RecordSchema,
  })
  .passthrough();

const InkeepRecordsCitedDataSchema = z
  .object({
    citations: z.array(CitationSchema).optional().nullable(),
  })
  .passthrough();

export type InkeepRecordsCitedData = z.infer<
  typeof InkeepRecordsCitedDataSchema
>;

export type InkeepCompleteMessage = {
  chat_session_id: string;
  message: InkeepMessage;
} & InkeepRecordsCitedData;

export type InkeepChatResultCallbacks = {
  onChunk?: (chunk: InkeepMessageChunkData) => void;
  onRecordsCited?: (recordsCited: InkeepRecordsCitedData) => void;
  onCompleteMessage?: (completeMessage: InkeepCompleteMessage) => void;
  onError?: (error: Error) => void;
};

// Define the type for the input arguments of handleStream
export type HandleStreamArgs = {
  textStream: ReadableStream;
  callbacks: Omit<InkeepChatResultCallbacks, "onError">;
};

export async function handleStream({
  textStream,
  callbacks: { onChunk, onCompleteMessage, onRecordsCited },
}: HandleStreamArgs) {
  let completeContent = "";
  let chat_session_id = "";
  let recordsCitedData: InkeepRecordsCitedData = { citations: [] };

  const parser = createParser((serverEvent: ParseEvent) => {
    if (serverEvent.type === "event") {
      switch (serverEvent.event) {
        case "message_chunk": {
          const inkeepContentChunk = InkeepMessageChunkDataSchema.parse(
            JSON.parse(serverEvent.data)
          );
          chat_session_id = inkeepContentChunk.chat_session_id;
          completeContent += inkeepContentChunk.content_chunk;
          onChunk?.(inkeepContentChunk);
          break;
        }
        case "records_cited": {
          const inkeepRecordsCited = InkeepRecordsCitedDataSchema.parse(
            JSON.parse(serverEvent.data)
          );
          recordsCitedData = inkeepRecordsCited;
          onRecordsCited?.(inkeepRecordsCited);
          break;
        }
        default:
          break;
      }
    }
  });

  if (typeof window === "undefined") {
    // Node.js environment
    for await (const chunk of textStream) {
      parser.feed(chunk);
    }
  } else {
    // Browser environment
    const reader = textStream.getReader();
    let result;
    while (!(result = await reader.read()).done) {
      const chunk = new TextDecoder().decode(result.value);
      parser.feed(chunk);
    }
  }

  onCompleteMessage?.({
    chat_session_id,
    message: { role: "assistant", content: completeContent },
    ...recordsCitedData,
  });

  parser.reset();
}
