#!/usr/bin/env python3
"""Auto-sync notifier signals → D1. Run every 30min via cron."""
import subprocess, os, json, re, hashlib, datetime, sys

env = dict(os.environ,
           PATH='/opt/node-v26:' + os.environ['PATH'],
           CLOUDFLARE_API_TOKEN=open('/root/.cf_tok').read().strip(),
           CLOUDFLARE_ACCOUNT_ID=open('/root/.cf_acct').read().strip())
CWD = '/root/pons-mcp'
LOG = '/root/grade_a_signals.txt'
MONTHS = {'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}

def to_iso(s):
    try:
        parts = s.replace(' WIB','').strip().split()
        day, mon, yr, tm = parts
        dt = datetime.datetime(int(yr), MONTHS[mon], int(day), *map(int, tm.split(':')))
        return dt.strftime('%Y-%m-%dT%H:%M:%S')
    except Exception:
        return None

def parse():
    text = open(LOG, encoding='utf-8', errors='ignore').read()
    blocks = re.split(r'\n={20,}\n', text)
    rows = {}
    for b in blocks:
        if '[GRADE' not in b and '[EARLY' not in b: continue
        src = 'GRADE A' if '[GRADE' in b else 'EARLY WATCH'
        sym = re.search(r'\$(\w+)\s', b)
        addr = re.search(r'0x[0-9a-fA-F]{40}', b)
        if not sym or not addr: continue
        price = re.search(r'Price\s*:\s*\$([\d.]+)', b)
        mc = re.search(r'MC\s*:\s*\$([\d.]+)([KM]?)', b)
        ath = re.search(r'ATH\s*:\s*\$([\d.]+)([KM]?)\s*\(-?(\d+)%\)', b)
        liq = re.search(r'Liq\s*:\s*\$([\d.]+)([KM]?)', b)
        holders = re.search(r'Total\s*:\s*(\d+)', b)
        rug = re.search(r'Rug\s*:\s*([\d.]+)', b)
        reno = re.search(r'Renounced\s*:\s*(✅|❌)', b)
        ts = re.search(r'(\d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2}) WIB', b)
        if not ts: continue
        iso = to_iso(ts.group(1))
        if not iso: continue
        def usd(v, suffix):
            n = float(v)
            return n * 1000 if suffix == 'K' else (n * 1_000_000 if suffix == 'M' else n)
        key = addr.group(0).lower()
        row = {
            'id': 'sig_' + hashlib.md5((key + iso).encode()).hexdigest()[:16],
            'source_type': src, 'symbol': sym.group(1), 'token_address': key, 'chain': 'robinhood',
            'price_usd': float(price.group(1)) if price else None,
            'market_cap_usd': usd(mc.group(1), mc.group(2)) if mc else None,
            'ath_usd': usd(ath.group(1), ath.group(2)) if ath else None,
            'ath_drawdown_pct': -float(ath.group(3)) if ath else None,
            'liquidity_usd': usd(liq.group(1), liq.group(2)) if liq else None,
            'holders_total': int(holders.group(1)) if holders else None,
            'rug_score': float(rug.group(1)) if rug else None,
            'renounced': 1 if (reno and reno.group(1) == '✅') else 0,
            'signal_at': iso,
        }
        # newest per token wins
        if key not in rows or iso > rows[key]['signal_at']:
            rows[key] = row
    return list(rows.values())

def d1(sql, tries=3):
    import time
    last = None
    for i in range(tries):
        r = subprocess.run(['npx','wrangler','d1','execute','ponsmcp-payments','--remote', f'--command={sql}','-y','--json'],
                           cwd=CWD, env=env, capture_output=True, text=True, timeout=90)
        if r.returncode == 0:
            raw = r.stdout
            return json.loads(raw[raw.find('['):raw.rfind(']')+1])
        last = r.stderr[-150:] or 'fetch failed'
        time.sleep(3 * (i + 1))
    raise RuntimeError(f'D1 failed after {tries} tries: {last}')

def esc(v):
    if v is None: return "''"
    if isinstance(v,(int,float)): return str(v)
    return "'" + str(v).replace("'","''") + "'"

def insert_batch(rows):
    cols = "(id,source_type,symbol,token_address,chain,price_usd,market_cap_usd,ath_usd,ath_drawdown_pct,liquidity_usd,holders_total,rug_score,renounced,signal_at,inserted_at,raw_text)"
    vals = []
    for r in rows:
        vals.append(f"({esc(r['id'])},{esc(r['source_type'])},{esc(r['symbol'])},{esc(r['token_address'])},'robinhood',{esc(r['price_usd'])},{esc(r['market_cap_usd'])},{esc(r['ath_usd'])},{esc(r['ath_drawdown_pct'])},{esc(r['liquidity_usd'])},{esc(r['holders_total'])},{esc(r['rug_score'])},{esc(r['renounced'])},{esc(r['signal_at'])},CURRENT_TIMESTAMP,'')")
    return f"INSERT OR IGNORE INTO market_signals {cols} VALUES {','.join(vals)};"

def main():
    rows = parse()
    print(f'{datetime.datetime.utcnow().isoformat()}Z parsed {len(rows)} unique tokens')
    if not rows: return
    # only insert signals newer than what's in D1
    existing = d1('SELECT MAX(signal_at) as m FROM market_signals;')
    max_ts = (existing[0]['results'][0].get('m') or '2000-01-01')[:19]
    fresh = [r for r in rows if r['signal_at'] > max_ts]
    print(f'new since {max_ts}: {len(fresh)}')
    inserted = 0
    for i in range(0, len(fresh), 5):
        try:
            d1(insert_batch(fresh[i:i+5]))
            inserted += min(5, len(fresh) - i)
        except Exception as e:
            print('chunk fail:', str(e)[:100])
    print(f'inserted {inserted} new signals')

if __name__ == '__main__':
    main()
