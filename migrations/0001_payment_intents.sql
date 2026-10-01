CREATE TABLE IF NOT EXISTS payment_intents (
  id TEXT PRIMARY KEY,
  merchant_address TEXT NOT NULL,
  amount_usdg_base TEXT NOT NULL,
  amount_usdg_display TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'failed')),
  tx_hash TEXT UNIQUE,
  created_at TEXT NOT NULL,
  verified_at TEXT
);

CREATE INDEX IF NOT EXISTS payment_intents_status_created_idx
  ON payment_intents(status, created_at DESC);
