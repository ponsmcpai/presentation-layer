#!/usr/bin/env python3
"""Bulk-insert parsed notifier signals into D1 (chunked, idempotent)."""
import json, subprocess, os, sys

rows = [json.loads(l) for l in open('/tmp/signals.jsonl')]
print(f"inserting {len(rows)} signals...")

def esc(v):
    if v is None: return 'NULL'
    if isinstance(v, bool): return '1' if v else '0'
    if isinstance(v, str): return "'" + v.replace("'", "''") + "'"
    return str(v)

COLS = ['id','source_type','symbol','token_address','chain','price_usd','volume_24h_usd','market_cap_usd','ath_usd','ath_drawdown_pct','liquidity_usd','change_5m_pct','change_1h_pct','age_text','holders_total','top10_pct','smart_buys','smart_sells','smart_net_usd','cluster_buy_wallets','rug_score','renounced','dev_hold_pct','x_handle','x_followers','narrative','raw_text','signal_at','inserted_at']

CHUNK = 25
env = dict(os.environ, PATH='/opt/node-v26:' + os.environ['PATH'],
           CLOUDFLARE_API_TOKEN=open('/root/.cf_tok').read().strip(),
           CLOUDFLARE_ACCOUNT_ID=open('/root/.cf_acct').read().strip())

total_inserted = 0
for i in range(0, len(rows), CHUNK):
    chunk = rows[i:i+CHUNK]
    values = []
    for r in chunk:
        values.append('(' + ','.join(esc(r.get(c)) for c in COLS) + ')')
    sql = f"INSERT OR IGNORE INTO market_signals ({','.join(COLS)}) VALUES " + ','.join(values) + ';'
    with open('/tmp/insert_chunk.sql', 'w') as f:
        f.write(sql)
    r = subprocess.run(['npx','wrangler','d1','execute','ponsmcp-payments','--remote','--file','/tmp/insert_chunk.sql','-y'],
                       cwd='/root/pons-mcp', env=env, capture_output=True, text=True, timeout=120)
    out = r.stdout + r.stderr
    import re
    m = re.search(r'"changes": (\d+)', out)
    total_inserted += int(m.group(1)) if m else 0
    print(f"  chunk {i//CHUNK+1}: changes={m.group(1) if m else '?'}")

print(f"done, total rows inserted: {total_inserted}")
