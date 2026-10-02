CREATE TABLE IF NOT EXISTS market_signals (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  token_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'Robinhood',
  price_usd REAL,
  volume_24h_usd REAL,
  market_cap_usd REAL,
  ath_usd REAL,
  ath_drawdown_pct REAL,
  liquidity_usd REAL,
  change_5m_pct REAL,
  change_1h_pct REAL,
  age_text TEXT,
  holders_total INTEGER,
  top10_pct REAL,
  smart_buys INTEGER,
  smart_sells INTEGER,
  smart_net_usd REAL,
  cluster_buy_wallets INTEGER,
  rug_score REAL,
  renounced INTEGER,
  dev_hold_pct REAL,
  x_handle TEXT,
  x_followers INTEGER,
  narrative TEXT,
  raw_text TEXT NOT NULL,
  signal_at TEXT NOT NULL,
  inserted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS market_signals_signal_at_idx ON market_signals(signal_at DESC);
CREATE INDEX IF NOT EXISTS market_signals_token_idx ON market_signals(token_address, signal_at DESC);
