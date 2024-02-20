import { InkeepAI } from "@inkeep/ai-api";
import * as dotenv from "dotenv";

dotenv.config(); // load env, specific to node

async function main() {
	if (!process.env.INKEEP_API_KEY || !process.env.INKEEP_INTEGRATION_ID) {
		throw new Error("Inkeep env variables are not defined");
	}

	const ikp = new InkeepAI({
		apiKey: process.env.INKEEP_API_KEY,
	});

	const res = await ikp.chatSession.create({
		integrationId: process.env.INKEEP_INTEGRATION_ID,
		chatSession: {
			messages: [
				{
					role: "user",
					content: "How do I get started?",
				},
			],
		},
		chatMode: process.env.INKEEP_CHAT_MODE,
		stream: true
	});

	// handling streamed response

	let chatSessionId: string | undefined | null = undefined;

	console.log("**CREATING CHAT SESSION**")

	if (res.chatResultStream) {
		for await (const event of res.chatResultStream) {
			if (event.event == "message_chunk") {
				chatSessionId = event.data.chatSessionId;
				console.log("Partial message chunk: " + event.data.contentChunk);
			}
			if (event.event == "records_cited") {
				console.log("Citations: " + JSON.stringify(event.data.citations, null, 2));
			}
		}
	}

	if (!chatSessionId) {
		console.error("No chat session id");
		return;
	}

	console.log("**CONTINUING CHAT SESSION**")

	const continuedChat = await ikp.chatSession.continue(chatSessionId, {
		integrationId: process.env.INKEEP_INTEGRATION_ID,
		message: {
			role: "user",
			content: "What's next?",
		},
		stream: false,
	});

	// handling non-streamed response

	if (continuedChat.chatResult) {
		console.log("Full response: " + JSON.stringify(continuedChat.chatResult, null, 2));
	}
}

main();
