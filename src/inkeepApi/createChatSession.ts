import { createParser } from "eventsource-parser";
import { TextDecoderStream } from "node:stream/web";
import { ReadableStream } from "stream/web";
import {
  CallbackFunctions,
  InkeepContentChunk,
  Message,
  handleStream,
} from "./common";

// Define the type for the request body
export interface CreateChatSessionInput {
  integration_id: string;
  chat_session: {
    messages: Array<Message>;
  };
}

interface CreateChatSessionArgs {
  input: CreateChatSessionInput;
  apiKey: string;
  callbacks: CallbackFunctions;
}

export async function createChatSession({ input, apiKey, callbacks }: CreateChatSessionArgs) {
  const { onError, ...expectedCallbacks } = callbacks;
  try {
    // Send the request to the Inkeep API
    const response = await fetch(
      "https://api.inkeep.com/v1/chat_sessions/chat_results",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(input),
      }
    );

    if (response.body) {
      // Create a TextDecoderStream to decode the SSE
      const textStream = response.body.pipeThrough(new TextDecoderStream());
      await handleStream({ textStream, callbacks: expectedCallbacks });
    } else {
      throw new Error("Response body is null");
    }
  } catch (error) {
    onError?.(error as Error);
  }
}
