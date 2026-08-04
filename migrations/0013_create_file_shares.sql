-- Secure, code-gated file sharing (Dropbox-style) served at /files.
-- An admin creates a "share" (named bundle of files) protected by a short
-- access code; the recipient opens www.kennion.com/files and types the code.
-- Files live in the DB as base64 because Railway's filesystem is ephemeral.

CREATE TABLE IF NOT EXISTS file_shares (
  id                  VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  code                TEXT        NOT NULL UNIQUE,
  note                TEXT,
  created_by_admin_id VARCHAR     REFERENCES users(id),
  enabled             BOOLEAN     NOT NULL DEFAULT TRUE,
  expires_at          TIMESTAMP,
  access_count        INTEGER     NOT NULL DEFAULT 0,
  last_accessed_at    TIMESTAMP,
  created_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shared_files (
  id                  VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id            VARCHAR     NOT NULL REFERENCES file_shares(id) ON DELETE CASCADE,
  file_name           TEXT        NOT NULL,
  mime_type           TEXT        NOT NULL DEFAULT 'application/octet-stream',
  size_bytes          INTEGER     NOT NULL DEFAULT 0,
  data_base64         TEXT        NOT NULL,
  uploaded_by_admin_id VARCHAR    REFERENCES users(id),
  created_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_files_share_id ON shared_files (share_id);
