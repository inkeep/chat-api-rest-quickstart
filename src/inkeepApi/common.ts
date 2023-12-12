import { createParser } from "eventsource-parser";
import { TextDecoderStream } from "node:stream/web";
import { ReadableStream } from "stream/web";

export type Message = {
  role: "user" | "assistant";
  content: string;
}

// Define the type for the InkeepContentChunk
export interface InkeepContentChunk {
  chat_session_id: string;
  message_chunk: string;
}

export type CompleteMessage = {
  chat_session_id: string;
  message: Message;
}

export type CallbackFunctions = {
  onChunk?: (chunk: InkeepContentChunk) => void;
  onCompleteMessage?: (completeMessage: CompleteMessage) => void;
  onError?: (error: Error) => void;
}

// Define the type for the input arguments of handleStream
export type HandleStreamArgs = {
  textStream: ReadableStream;
  callbacks: Omit<CallbackFunctions, 'onError'>;
}

export async function handleStream({ textStream, callbacks: { onChunk, onCompleteMessage } }: HandleStreamArgs) {

  // Initialize an empty string to store the complete message
  let completeContent = "";
  let chat_session_id = "";

  // Create a parser
  const parser = createParser((event) => {
    if (event.type === "event") {
      const inkeepContentChunk: InkeepContentChunk = JSON.parse(event.data);
      chat_session_id = inkeepContentChunk.chat_session_id;
      completeContent += inkeepContentChunk.message_chunk;
      onChunk?.(inkeepContentChunk);
    }
  });

  // Feed the chunks to the parser
  for await (const chunk of textStream) {
    parser.feed(chunk);
  }

  // Call the onCompleteMessage callback
  onCompleteMessage?.({ chat_session_id, message: { role: 'assistant', content: completeContent } });

  // Reset the parser if you want to re-use it
  parser.reset();
}