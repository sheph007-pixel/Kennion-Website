-- Pivot file sharing to a single shared "vault" with two codes:
--   viewer code (code)        — recipients type it to view/download
--   admin code  (admin_code)  — the owner types it to upload/manage
-- both on the same /files page, no login required.

ALTER TABLE file_shares ADD COLUMN IF NOT EXISTS admin_code TEXT;
ALTER TABLE file_shares ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Seed the single default vault with the owner's chosen codes if none
-- exists yet. Codes are stored normalized (uppercase, alphanumeric only)
-- so "2026blockmove" and "2026BLOCKMOVE" both match at the gate.
INSERT INTO file_shares (name, code, admin_code, is_default, enabled)
SELECT 'Kennion Files', '2026BLOCKMOVE', '8787', TRUE, TRUE
WHERE NOT EXISTS (SELECT 1 FROM file_shares WHERE is_default = TRUE);
