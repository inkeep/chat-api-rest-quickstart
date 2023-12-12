import { createParser } from "eventsource-parser";
import { TextDecoderStream } from "node:stream/web";
import { ReadableStream } from "stream/web";
declare var window: any;

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
  let completeContent = "";
  let chat_session_id = "";

  const parser = createParser((event) => {
    if (event.type === "event") {
      const inkeepContentChunk: InkeepContentChunk = JSON.parse(event.data);
      chat_session_id = inkeepContentChunk.chat_session_id;
      completeContent += inkeepContentChunk.message_chunk;
      onChunk?.(inkeepContentChunk);
    }
  });

  if (typeof window === 'undefined') { // Node.js environment
    for await (const chunk of textStream) {
      parser.feed(chunk);
    }
  } else { // Browser environment
    const reader = textStream.getReader();
    let result;
    while (!(result = await reader.read()).done) {
      const chunk = new TextDecoder().decode(result.value);
      parser.feed(chunk);
    }
  }

  onCompleteMessage?.({ chat_session_id, message: { role: 'assistant', content: completeContent } });
  parser.reset();
}