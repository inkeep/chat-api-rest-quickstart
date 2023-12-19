import { TextDecoderStream } from "node:stream/web";
import {
  InkeepChatResultCallbacks,
  InkeepMessage,
  handleStream,
} from "./handleStream";
import { InkeepApiClient } from "./inkeepClient";

// Define the type for the request body
export interface ContinueChatInput {
  integration_id: string;
  chat_session_id: string;
  message: InkeepMessage;
}

interface ContinueChatArgs {
  input: ContinueChatInput;
  client: InkeepApiClient;
  callbacks: InkeepChatResultCallbacks;
}

export async function continueChat({
  input,
  client,
  callbacks,
}: ContinueChatArgs) {
  const { onError, ...expectedCallbacks } = callbacks;
  try {
    const response = await client.fetch({
      path: `/chat_sessions/${input.chat_session_id}/chat_results`,
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
