CREATE TABLE IF NOT EXISTS api_rate_limits (
  bucket TEXT NOT NULL,
  client_ip TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, client_ip, window_start)
);
