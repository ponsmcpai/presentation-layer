#!/usr/bin/env python3
"""Parse notifier.py's Grade A / Early Watch Telegram archive into signal rows.

The notifier is the live data source. This script NEVER invents scores: fields are
extracted only when present in the forwarded signal. Run by the sync job before
writing to D1. Output is JSON Lines to stdout for auditing.
"""
from __future__ import annotations
import hashlib, json, re, sys
from datetime import datetime
from pathlib import Path

LOG = Path('/root/grade_a_signals.txt')

NUM = r'([0-9]+(?:\.[0-9]+)?)'

def money(value: str | None, unit: str | None = None):
    if not value: return None
    n = float(value.replace(',', ''))
    u = (unit or '').upper()
    if u == 'K': n *= 1_000
    elif u == 'M': n *= 1_000_000
    elif u == 'B': n *= 1_000_000_000
    return n

def find(pattern: str, text: str, flags=0):
    m = re.search(pattern, text, flags)
    return m.groups() if m else None

def parse_block(block: str, source: str):
    # First header line convention: emoji $TICKER ... [A]
    m = re.search(r'\$([A-Za-z0-9_]+)', block)
    token = re.search(r'0x[a-fA-F0-9]{40}', block)
    if not m or not token: return None
    symbol = m.group(1).upper()
    address = token.group(0).lower()

    def dollar_field(label):
        got = find(rf'{label}\s*:\s*\$?{NUM}\s*([KMBkmb]?)', block)
        return money(got[0], got[1]) if got else None
    def pct_field(label):
        got = find(rf'{label}\s*:\s*[🟢🔴]?\s*([+-]?{NUM})%', block)
        return float(got[0]) if got else None

    price_match = find(r'Price\s*:\s*\$?([0-9.eE+-]+)', block)
    price = float(price_match[0]) if price_match else None
    ath_match = find(r'ATH\s*:\s*\$?'+NUM+r'\s*([KMBkmb]?)\s*\(([-+]?'+NUM+r')%\)', block)
    ath = money(ath_match[0], ath_match[1]) if ath_match else None
    ath_dd = float(ath_match[2]) if ath_match else None
    holders = find(r'Total\s*:\s*(\d+)', block)
    top10 = find(r'Top10\s*:\s*'+NUM+r'%', block)
    trades = find(r'Trades:\s*🟢\s*(\d+)\s*buy\s*/\s*🔴\s*(\d+)\s*sell', block)
    net = find(r'Net\s*:\s*([+-])\$?'+NUM+r'\s*([KMBkmb]?)', block)
    cluster = find(r'Cluster:\s*(\d+)\s*wallets?\s*BUY', block, re.I)
    rug = find(r'Rug\s*:\s*'+NUM, block)
    dev = find(r'Dev hold:\s*'+NUM+r'%', block, re.I)
    renounced = 'Renounced: ✅' in block
    age = find(r'Age\s*:\s*([^\n\r]+)', block)
    x = find(r'X\s*:\s*@([^\s❌✅]+).*?([0-9,]+)\s*followers', block)

    # Narrative is commonly last human-text line following the metadata.
    narrative = None
    for line in reversed([x.strip() for x in block.splitlines()]):
        if line and not line.startswith(('━','├','└','📊','🏦','🧠','🛡','🛒','🐦','⏱','[','🟢 $')) and len(line) > 12:
            narrative = line
            break

    timestamp = find(r'⏱\s*([^\n\r]+)', block)
    raw_time = timestamp[0].strip() if timestamp else datetime.utcnow().isoformat()+'Z'
    uid = hashlib.sha256((source+'|'+address+'|'+raw_time).encode()).hexdigest()[:24]
    return {
        'id': 'sig_'+uid, 'source_type': source, 'symbol': symbol, 'token_address': address,
        'chain': 'Robinhood', 'price_usd': price,
        'volume_24h_usd': dollar_field('Vol24'), 'market_cap_usd': dollar_field('MC'),
        'ath_usd': ath, 'ath_drawdown_pct': ath_dd, 'liquidity_usd': dollar_field('Liq'),
        'change_5m_pct': pct_field('5m'), 'change_1h_pct': pct_field('1h'),
        'age_text': age[0].strip() if age else None,
        'holders_total': int(holders[0]) if holders else None,
        'top10_pct': float(top10[0]) if top10 else None,
        'smart_buys': int(trades[0]) if trades else None,
        'smart_sells': int(trades[1]) if trades else None,
        'smart_net_usd': ((1 if net and net[0]=='+' else -1) * (money(net[1], net[2]) or 0)) if net else None,
        'cluster_buy_wallets': int(cluster[0]) if cluster else None,
        'rug_score': float(rug[0]) if rug else None,
        'renounced': 1 if renounced else 0,
        'dev_hold_pct': float(dev[0]) if dev else None,
        'x_handle': x[0] if x else None,
        'x_followers': int(x[1].replace(',','')) if x else None,
        'narrative': narrative, 'raw_text': block.strip(), 'signal_at': raw_time,
        'inserted_at': datetime.utcnow().isoformat()+'Z',
    }

def main():
    text = LOG.read_text(encoding='utf-8', errors='ignore') if LOG.exists() else ''
    # Keep recent source data; every block has [GRADE [A]] or [EARLY WATCH].
    chunks = re.split(r'\n={20,}\n', text)
    rows = []
    seen = set()
    for chunk in chunks[-500:]:
        source = 'GRADE A' if '[GRADE [A]]' in chunk else 'EARLY WATCH' if '[EARLY WATCH]' in chunk else None
        if not source: continue
        row = parse_block(chunk, source)
        if row and row['id'] not in seen:
            seen.add(row['id']); rows.append(row)
    import datetime
    def ts_key(r):
        try:
            # "03 Oct 2026 18:17:29 WIB"
            dt = datetime.datetime.strptime(r['signal_at'].replace(' WIB','').strip(), '%d %b %Y %H:%M:%S')
            return dt.timestamp()
        except Exception:
            return 0
    rows.sort(key=ts_key, reverse=True)
    # Dedup: newest per token_address
    seen_tokens = {}
    deduped = []
    for row in rows:
        if row['token_address'] not in seen_tokens:
            seen_tokens[row['token_address']] = row
            deduped.append(row)
    for row in deduped[:150]: print(json.dumps(row, ensure_ascii=False))

if __name__ == '__main__': main()
