import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
import json, warnings
warnings.filterwarnings('ignore')

df = pd.read_csv('/mnt/user-data/uploads/clujNapoca_data.csv')
df.columns = df.columns.str.strip().str.lstrip('\ufeff')
df['suburb'] = df['suburbs'].str.strip()
df['total_plastic_kg']  = df['plastic_weight_kg']
df['total_metal_kg']    = df['metal_weight_kg']
df['total_glass_kg']    = df['glass_weight_kg']
df['total_items']       = df['plastic_pieces'] + df['metal_pieces'] + df['glass_pieces']
df['total_weight_kg']   = df['total_plastic_kg'] + df['total_metal_kg'] + df['total_glass_kg']
df['time_idx']          = (df['year'] - 2024) * 12 + df['month']

# ── Focus suburbs that appear in the city context ──────────────────────────
FOCUS = ['Cluj-Napoca','Florești','Apahida','Baciu','Gilău',
         'Câmpia Turzii','Turda','Dej','Gherla','Huedin']

agg = df.groupby(['suburb','year','month','time_idx']).agg(
    total_weight_kg=('total_weight_kg','sum'),
    total_items=('total_items','sum'),
    plastic_kg=('total_plastic_kg','sum'),
    metal_kg=('total_metal_kg','sum'),
    glass_kg=('total_glass_kg','sum'),
).reset_index()

# ── Trend analysis per suburb ──────────────────────────────────────────────
trends = {}
for suburb in FOCUS:
    sub = agg[agg.suburb == suburb].sort_values('time_idx')
    if len(sub) < 3: continue
    X = sub['time_idx'].values.reshape(-1,1)
    reg = LinearRegression().fit(X, sub['total_weight_kg'])
    latest = sub.iloc[-1]
    trends[suburb] = {
        'avg_monthly_kg':   round(float(sub['total_weight_kg'].mean()), 1),
        'max_monthly_kg':   round(float(sub['total_weight_kg'].max()), 1),
        'trend_per_month':  round(float(reg.coef_[0]), 1),
        'trend_direction':  'increasing' if reg.coef_[0] > 0 else 'decreasing',
        'latest_weight_kg': round(float(latest['total_weight_kg']), 1),
        'plastic_share':    round(float(latest['plastic_kg'] / max(latest['total_weight_kg'],1) * 100), 1),
        'metal_share':      round(float(latest['metal_kg']  / max(latest['total_weight_kg'],1) * 100), 1),
        'glass_share':      round(float(latest['glass_kg']  / max(latest['total_weight_kg'],1) * 100), 1),
    }

# ── Generate synthetic bin fill predictions (per suburb per fraction) ───────
# Normalize to daily fill % of a standard 240L bin
KG_PER_BIN_PER_DAY = { 'plastic': 3.5, 'metal': 5.2, 'glass': 8.0 }
DAYS_PER_MONTH = 22  # working days

predictions = {}
for suburb, t in trends.items():
    avg = t['avg_monthly_kg']
    plastic_day = (avg * t['plastic_share'] / 100) / DAYS_PER_MONTH
    metal_day   = (avg * t['metal_share']   / 100) / DAYS_PER_MONTH
    glass_day   = (avg * t['glass_share']   / 100) / DAYS_PER_MONTH
    predictions[suburb] = {
        'daily_plastic_kg':     round(plastic_day, 1),
        'daily_metal_kg':       round(metal_day, 1),
        'daily_glass_kg':       round(glass_day, 1),
        'plastic_fill_pct_day': round(min(plastic_day / KG_PER_BIN_PER_DAY['plastic'] * 100, 100), 1),
        'metal_fill_pct_day':   round(min(metal_day   / KG_PER_BIN_PER_DAY['metal']   * 100, 100), 1),
        'glass_fill_pct_day':   round(min(glass_day   / KG_PER_BIN_PER_DAY['glass']   * 100, 100), 1),
        'avg_fill_rate_pct':    round((plastic_day/KG_PER_BIN_PER_DAY['plastic'] +
                                       metal_day/KG_PER_BIN_PER_DAY['metal'] +
                                       glass_day/KG_PER_BIN_PER_DAY['glass']) / 3 * 100, 1),
        'trend': t['trend_direction'],
        'trend_per_month_kg': t['trend_per_month'],
    }

# ── Monthly breakdown for charting ─────────────────────────────────────────
cluj = agg[agg.suburb=='Cluj-Napoca'].sort_values('time_idx')
floresti = agg[agg.suburb=='Florești'].sort_values('time_idx')

monthly_chart = []
for _, row in cluj.iterrows():
    monthly_chart.append({
        'label': f"{int(row.year)}-{int(row.month):02d}",
        'cluj_kg': int(row.total_weight_kg),
    })

# merge floresti
for i, row in floresti.iterrows():
    lbl = f"{int(row.year)}-{int(row.month):02d}"
    entry = next((e for e in monthly_chart if e['label']==lbl), None)
    if entry: entry['floresti_kg'] = int(row.total_weight_kg)

print("=== TRENDS ===")
for k,v in trends.items():
    print(f"{k}: avg={v['avg_monthly_kg']}kg/mo, trend={v['trend_direction']} ({v['trend_per_month']:+.0f}kg/mo)")

print("\n=== FILL RATE PREDICTIONS ===")
for k,v in predictions.items():
    print(f"{k}: avg daily fill rate = {v['avg_fill_rate_pct']}%/day, trend={v['trend']}")

# Save JSON for the app
output = { 'trends': trends, 'predictions': predictions, 'monthly_chart': monthly_chart }
with open('/home/claude/cluj_analytics.json', 'w') as f:
    json.dump(output, f, indent=2)
print("\nSaved to /home/claude/cluj_analytics.json")
