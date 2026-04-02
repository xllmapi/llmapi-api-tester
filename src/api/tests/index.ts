import type { TestDef } from "../../types";
import { openaiModelsTest } from "./openai-models";
import { openaiChatTest } from "./openai-chat";
import { openaiChatStreamTest } from "./openai-chat-stream";
import { anthropicMessagesTest } from "./anthropic-messages";
import { anthropicMessagesStreamTest } from "./anthropic-messages-stream";

export const allTests: TestDef[] = [
  openaiModelsTest,
  openaiChatTest,
  openaiChatStreamTest,
  anthropicMessagesTest,
  anthropicMessagesStreamTest,
];

export const openaiTests = allTests.filter((t) => t.protocol === "openai");
export const anthropicTests = allTests.filter((t) => t.protocol === "anthropic");
