import { createParser } from "eventsource-parser";
import { TextDecoderStream } from "node:stream/web";
import { ReadableStream } from "stream/web";
import { z } from "zod";

declare var window: any;

export type Message = {
  role: "user" | "assistant";
  content: string;
};

// Define the base schema
const InkeepChatResultEventSchema = z.object({
  type: z.string(),
  event: z.string(),
  data: z.unknown(), // equivalent to 'any' in TypeScript
});

// Define the schema for InkeepMessageChunkData
const InkeepMessageChunkDataSchema = z.object({
  chat_session_id: z.string(),
  content_chunk: z.string(),
});

// Extend the base schema to create the schema for InkeepMessageChunkEvent
const InkeepMessageChunkEventSchema = InkeepChatResultEventSchema.extend({
  type: z.literal("event"),
  event: z.literal("message_chunk"),
  data: InkeepMessageChunkDataSchema,
});

export type InkeepChatResultEvent = z.infer<typeof InkeepChatResultEventSchema>;
export type InkeepMessageChunkData = z.infer<
  typeof InkeepMessageChunkDataSchema
>;
export type InkeepMessageChunkEvent = z.infer<
  typeof InkeepMessageChunkEventSchema
>;

export type InkeepCompleteMessage = {
  chat_session_id: string;
  message: Message;
};

export type InkeepChatResultCallbacks = {
  onChunk?: (chunk: InkeepMessageChunkData) => void;
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
  callbacks: { onChunk, onCompleteMessage },
}: HandleStreamArgs) {
  let completeContent = "";
  let chat_session_id = "";

  const parser = createParser((streamedEvent) => {

    console.log("streamedEvent", streamedEvent);
    const result = InkeepChatResultEventSchema.safeParse(streamedEvent);

    console.log("result", result); 
    if (result.success) {
      console.log("result.data", result.data)
      console.log("result.data.event", result.data.event)
      switch (result.data.event) {
        case "message_chunk": {
          const messageChunkResult = InkeepMessageChunkEventSchema.safeParse(result.data);
          console.log("messageChunkResult", messageChunkResult);
          if (messageChunkResult.success) {
            console.log("messageChunkResult.data", messageChunkResult.data);
            const inkeepContentChunk = messageChunkResult.data.data;
            chat_session_id = inkeepContentChunk.chat_session_id;
            completeContent += inkeepContentChunk.content_chunk;
            console.log("content_chunk", inkeepContentChunk.content_chunk); // Add this line
            console.log("completeContent after concatenation", completeContent); // And this line
            onChunk?.(inkeepContentChunk);
          }
          break;
        }
        // Add more cases as needed
        default:
          console.log("Unhandled event type:", result.data.event);
      }
    } else {
      console.error("Invalid streamedEvent:", result.error);
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

  console.log("completeContent", completeContent);
  onCompleteMessage?.({
    chat_session_id,
    message: { role: "assistant", content: completeContent },
  });

  parser.reset();
}

