import { TextDecoderStream } from "node:stream/web";
import {
  InkeepChatResultCallbacks,
  InkeepMessage,
  handleStream,
} from "./handleStream";
import { InkeepApiClient } from "./inkeepClient";

// Define the type for the request body
export interface CreateChatSessionInput {
  integration_id: string;
  chat_mode?: "auto" | "turbo"; // default: 'auto'
  chat_session: {
    messages: Array<InkeepMessage>;
  };
  stream?: boolean; // default: false
}

interface CreateChatSessionArgs {
  input: CreateChatSessionInput;
  client: InkeepApiClient;
  callbacks: InkeepChatResultCallbacks;
}

export async function createChatSession({
  input,
  client,
  callbacks,
}: CreateChatSessionArgs) {
  const { onError, ...expectedCallbacks } = callbacks;
  try {
    // Send the request to the Inkeep API
    const response = await client.fetch({
      path: "/chat_sessions/chat_results",
      body: input,
      options: {
        method: "POST",
      },
    });

    if (!response.ok) {
      onError?.(new Error(`HTTP error! status: ${response.status}`));
      return;
    }

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
