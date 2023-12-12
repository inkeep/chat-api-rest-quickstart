import { CreateChatSessionInput, createChatSession } from './inkeepApi/createChatSession';
import { ContinueChatInput, continueChat } from './inkeepApi/continueChatSession';
import { InkeepApiClient, InkeepChatResultCallbacks, InkeepCompleteMessage } from './inkeepApi';



async function main() {

  if (!process.env.INKEEP_API_KEY || !process.env.INKEEP_INTEGRATION_ID) {
    throw new Error('Inkeep env variables are not defined');
  }

  // Hard code an example request body for createChatSession
  const createInput : CreateChatSessionInput = {
    integration_id: process.env.INKEEP_INTEGRATION_ID,
    chat_session: {
      messages: [
        {
          role: "user",
          content: "How do I get started?",
        },
      ],
    },
  };

  console.log("api key", process.env.INKEEP_API_KEY);
  console.log("integration id", process.env.INKEEP_INTEGRATION_ID);

  const client = new InkeepApiClient(process.env.INKEEP_API_KEY);


  const callbacks: InkeepChatResultCallbacks = {
    onChunk: (chunk ) => {
      console.log("Received chunk: ", chunk);
    },
    onCompleteMessage: (completeMessage) => {
      console.log("Chat Session ID: ", completeMessage.chat_session_id);
      console.log("Complete message content: ", completeMessage.message.content);
    },
    onError: (error) => {
      console.error(`Error: ${error.message}`);
    },
  };

  try {
    console.log("---Starting chat session...");

    const chatSessionPromise = new Promise<InkeepCompleteMessage>((resolve, reject) => {
      createChatSession({
        input: createInput,
        client,
        callbacks: {
          ...callbacks,
          onCompleteMessage: (completeMessage) => {
            console.log("---Chat session complete!")
            callbacks.onCompleteMessage?.(completeMessage);
            resolve(completeMessage);
          },
          onError: (error) => {
            callbacks.onError?.(error);
            reject(error);
          },
        },
      });
    });


    const completeMessage = await chatSessionPromise;

    console.log(completeMessage);

    const continueInput: ContinueChatInput = {
      integration_id: process.env.INKEEP_INTEGRATION_ID!,
      chat_session_id: completeMessage.chat_session_id,
      message: {
        role: "user",
        content: "What's next?",
      },
    };

    // console.log("---Continuing chat session...");
    // continueChat({ input: continueInput, client, callbacks });
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
  }
}

main();