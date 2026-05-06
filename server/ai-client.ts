import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

let _openai: OpenAI | null = null;
let _anthropic: Anthropic | null = null;

export function getOpenAIClient(): OpenAI {
  if (_openai) return _openai;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export function getAnthropicClient(): Anthropic {
  if (_anthropic) return _anthropic;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}
