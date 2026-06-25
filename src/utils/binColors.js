export const getBinColor = (bin) => {
  if (bin.contaminated) return '#8b5cf6';
  if (bin.fill > 85)    return '#ef4444';
  if (bin.fill > 60)    return '#f59e0b';
  return '#22c55e';
};
export const getBinStatus = (bin) => {
  if (bin.contaminated) return 'Contaminated';
  if (bin.fill > 85)    return 'Overflow';
  if (bin.fill > 60)    return 'High fill';
  return 'Normal';
};
export const buildPopupContent = (bin) => {
  const color  = getBinColor(bin);
  const status = getBinStatus(bin);
  const trend  = bin.fillRateMultiplier > 1.5 ? '↑ High-volume suburb' : bin.fillRateMultiplier < 0.5 ? '↓ Low-volume suburb' : '';
  return `
    <div style="font-weight:700;font-size:13px;color:#f1f5f9;margin-bottom:8px">${bin.name}</div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin:2px 0"><span>Suburb</span><span style="color:#94a3b8;font-weight:500">${bin.suburb}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin:2px 0"><span>District</span><span style="color:#94a3b8">${bin.district}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin:2px 0"><span>Fill level</span><span style="color:${color};font-weight:700">${Math.round(bin.fill)}%</span></div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin:2px 0"><span>Status</span><span style="color:${color};font-weight:600">${status}</span></div>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin:2px 0"><span>Monthly volume</span><span style="color:#94a3b8">${(bin.monthlyWeightKg/1000).toFixed(0)}t</span></div>
    ${trend ? `<div style="font-size:10px;color:#f59e0b;margin-top:4px;font-weight:500">${trend}</div>` : ''}
    <div style="font-size:9px;color:#334155;margin-top:2px">Data: Supercom SA 2024–2026</div>
    <div style="margin-top:8px;height:5px;border-radius:4px;background:#0f172a;overflow:hidden">
      <div style="height:100%;width:${bin.fill}%;background:${color};border-radius:4px;transition:width 0.5s"></div>
    </div>`;
};
