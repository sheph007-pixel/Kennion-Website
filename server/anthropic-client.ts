import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;

// The Railway service stores the Anthropic key under the legacy variable
// name CLAUDE; ANTHROPIC_API_KEY takes precedence when both are set. The
// SDK only auto-reads ANTHROPIC_API_KEY, so the key is passed explicitly.
function resolveApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY || process.env.CLAUDE;
}

export function anthropicAvailable(): boolean {
  return !!resolveApiKey();
}

export function getAnthropicClient(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error("Neither ANTHROPIC_API_KEY nor CLAUDE environment variable is set");
  }
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}
