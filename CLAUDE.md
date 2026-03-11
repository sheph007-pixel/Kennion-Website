# Claude Code Instructions

## Deployment
- All changes must be pushed live immediately after being made.
- Railway is configured to deploy from branch: `claude/migrate-from-replit-bmaFc`
- Always commit and push to `claude/migrate-from-replit-bmaFc` — this is the live deployment branch.
- Do NOT push to `main` (no push permission).

## Environment Variables
- **OPENAI_API_KEY** - Required for AI-powered CSV cleaning and data standardization
  - Add this to Railway environment variables
  - Get API key from https://platform.openai.com/api-keys
  - Click "Create new secret key" and copy the key
