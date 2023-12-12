import { CreateChatSessionInput, createChatSession } from './inkeepApi/createChatSession';
import { ContinueChatInput, continueChat } from './inkeepApi/continueChatSession';
import { CallbackFunctions, CompleteMessage, InkeepContentChunk } from './inkeepApi/common';

async function main() {
  // Hard code an example request body for createChatSession
  const createInput : CreateChatSessionInput = {
    integration_id: process.env.INKEEP_INTEGRATION_ID!,
    chat_session: {
      messages: [
        {
          role: "user",
          content: "How do I get started?",
        },
      ],
    },
  };

  const apiKey = process.env.INKEEP_API_KEY!;

  const callbacks: CallbackFunctions = {
    onChunk: (chunk: InkeepContentChunk) => {
      // console.log("Received chunk: ", chunk);
    },
    onCompleteMessage: (completeMessage: CompleteMessage) => {
      console.log("Chat Session ID: ", completeMessage.chat_session_id);
      console.log("Complete message content: ", completeMessage.message.content);
    },
    onError: (error: Error) => {
      console.error(`Error: ${error.message}`);
    },
  };

  try {
    console.log("---Starting chat session...");
    await createChatSession({ input: createInput, apiKey, callbacks: {...callbacks, onCompleteMessage: (completeMessage: CompleteMessage) => {
      callbacks.onCompleteMessage?.(completeMessage);
    
      const continueInput: ContinueChatInput = {
        integration_id: process.env.INKEEP_INTEGRATION_ID!,
        chat_session_id: completeMessage.chat_session_id,
        message: {
          role: "user",
          content: "What's next?",
        },
      };
    
      console.log("---Continuing chat session...");
      continueChat({ input: continueInput, apiKey, callbacks });
    }, } });
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
  }
}

main();