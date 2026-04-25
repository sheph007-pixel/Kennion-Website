-- Dashboard AI chat assistant: persisted transcripts + admin-editable rules.
-- Both tables are introduced by the chat widget feature; the existing
-- deploy command is `npm run start`, which means schema changes only
-- ship via the runMigrations() boot step (server/migrate.ts), not via
-- drizzle-kit push. Live DB needs these explicitly.

CREATE TABLE IF NOT EXISTS chat_messages (
  id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR NOT NULL,
  user_id         VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id        VARCHAR REFERENCES groups(id) ON DELETE SET NULL,
  role            TEXT    NOT NULL,
  content         TEXT    NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_id_idx
  ON chat_messages (conversation_id);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_created_at_idx
  ON chat_messages (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_rules (
  id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  label       TEXT    NOT NULL,
  content     TEXT    NOT NULL,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
