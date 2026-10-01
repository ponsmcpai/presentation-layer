CREATE TABLE IF NOT EXISTS merchants (
  address TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS merchant_services (
  id TEXT PRIMARY KEY,
  merchant_address TEXT NOT NULL REFERENCES merchants(address),
  name TEXT NOT NULL,
  resource_path TEXT NOT NULL,
  price_usdg_base TEXT NOT NULL,
  price_usdg_display TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS merchant_services_merchant_idx
  ON merchant_services(merchant_address, active);

ALTER TABLE payment_intents ADD COLUMN service_id TEXT;
