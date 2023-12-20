import {
  ContinueChatInput,
  CreateChatSessionInput,
  InkeepApiClient,
  InkeepChatResultCallbacks,
  InkeepCompleteMessage,
  continueChat,
  createChatSession,
} from "./inkeepApi";
import * as dotenv from "dotenv";

dotenv.config(); // load env, specific to node

async function main() {
  if (!process.env.INKEEP_API_KEY || !process.env.INKEEP_INTEGRATION_ID) {
    throw new Error("Inkeep env variables are not defined");
  }

  // Hard code an example request body for createChatSession
  const createInput: CreateChatSessionInput = {
    integration_id: process.env.INKEEP_INTEGRATION_ID,
    chat_session: {
      messages: [
        {
          role: "user",
          content: "How do I get started?",
        },
      ],
    },
    stream: true,
    chat_mode:
      (process.env.INKEEP_CHAT_MODE as CreateChatSessionInput["chat_mode"]) ||
      "auto",
  };

  const client = new InkeepApiClient(process.env.INKEEP_API_KEY);

  const callbacks: InkeepChatResultCallbacks = {
    onChunk: (chunk) => {
      // console.log("Received chunk: ", chunk);
    },
    onCompleteMessage: (completeMessage) => {
      console.log("-ON COMPLETED MESSAGE-");
      console.log(JSON.stringify(completeMessage, null, 2));
    },
    onRecordsCited: (recordsCited) => {
      console.log("-ON RECORDS CITED-");
      console.log(JSON.stringify(recordsCited, null, 2));
    },
    onError: (error) => {
      console.error(`Error: ${error.message}`);
    },
  };

  try {
    console.log("------STARTING NEW CHAT SESSION------");

    const chatSessionPromise = new Promise<InkeepCompleteMessage>(
      (resolve, reject) => {
        createChatSession({
          input: createInput,
          client,
          callbacks: {
            ...callbacks,
            onCompleteMessage: (completeMessage) => {
              callbacks.onCompleteMessage?.(completeMessage);
              resolve(completeMessage);
            },
            onError: (error) => {
              callbacks.onError?.(error);
              reject(error);
            },
          },
        });
      }
    );

    const completeMessage = await chatSessionPromise;

    const continueInput: ContinueChatInput = {
      integration_id: process.env.INKEEP_INTEGRATION_ID!,
      chat_session_id: completeMessage.chat_session_id,
      message: {
        role: "user",
        content: "What's next?",
      },
      stream: true,
    };

    console.log("------CONTINUING NEW CHAT SESSION------");
    continueChat({ input: continueInput, client, callbacks });
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
  }
}

main();
