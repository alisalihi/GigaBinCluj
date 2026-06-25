// Real data from Supercom SA Cluj-Napoca 2024-2026
export const INITIAL_BINS = [
  { id:'B01', name:'Piața Unirii',     suburb:'Cluj-Napoca', district:'Centru',   lat:46.7712, lng:23.5895, fill:77.3, contaminated:false, fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B02', name:'Teatrul Național', suburb:'Cluj-Napoca', district:'Centru',   lat:46.7730, lng:23.5910, fill:90.4, contaminated:false, fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B03', name:'Bd. 21 Decembrie', suburb:'Cluj-Napoca', district:'Centru',   lat:46.7720, lng:23.5850, fill:76.5, contaminated:false, fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B04', name:'Str. Eroilor',     suburb:'Cluj-Napoca', district:'Centru',   lat:46.7695, lng:23.5872, fill:95.0, contaminated:false, fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B05', name:'Parcul Central',   suburb:'Cluj-Napoca', district:'Centru',   lat:46.7700, lng:23.5920, fill:88.7, contaminated:true,  fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B06', name:'Mănăștur Nord',    suburb:'Cluj-Napoca', district:'Mănăștur', lat:46.7810, lng:23.5620, fill:86.2, contaminated:false, fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B07', name:'Mănăștur Piața',   suburb:'Cluj-Napoca', district:'Mănăștur', lat:46.7765, lng:23.5680, fill:84.0, contaminated:false, fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B08', name:'Mănăștur Sud',     suburb:'Cluj-Napoca', district:'Mănăștur', lat:46.7740, lng:23.5640, fill:95.0, contaminated:false, fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B09', name:'Mărăști Nord',     suburb:'Cluj-Napoca', district:'Mărăști',  lat:46.7780, lng:23.5980, fill:91.6, contaminated:false, fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B10', name:'Mărăști Piața',    suburb:'Cluj-Napoca', district:'Mărăști',  lat:46.7750, lng:23.6030, fill:95.0, contaminated:true,  fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B11', name:'Mărăști Sud',      suburb:'Cluj-Napoca', district:'Mărăști',  lat:46.7720, lng:23.6000, fill:95.0, contaminated:false, fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B12', name:'Someșeni Est',     suburb:'Cluj-Napoca', district:'Someșeni', lat:46.7850, lng:23.6180, fill:76.4, contaminated:false, fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B13', name:'Someșeni Centru',  suburb:'Cluj-Napoca', district:'Someșeni', lat:46.7880, lng:23.6100, fill:81.0, contaminated:false, fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B14', name:'Someșeni Vest',    suburb:'Cluj-Napoca', district:'Someșeni', lat:46.7840, lng:23.6050, fill:95.0, contaminated:false, fillRateMultiplier:2.00, monthlyWeightKg:4922710 },
  { id:'B15', name:'Florești Centru',  suburb:'Florești',    district:'Florești', lat:46.7580, lng:23.5780, fill:77.5, contaminated:false, fillRateMultiplier:1.85, monthlyWeightKg:774822  },
  { id:'B16', name:'Florești Nord',    suburb:'Florești',    district:'Florești', lat:46.7630, lng:23.5810, fill:86.3, contaminated:false, fillRateMultiplier:1.85, monthlyWeightKg:774822  },
  { id:'B17', name:'Florești Piața',   suburb:'Florești',    district:'Florești', lat:46.7560, lng:23.5850, fill:95.0, contaminated:false, fillRateMultiplier:1.85, monthlyWeightKg:774822  },
  { id:'B18', name:'Florești Sud',     suburb:'Florești',    district:'Florești', lat:46.7530, lng:23.5820, fill:78.2, contaminated:false, fillRateMultiplier:1.85, monthlyWeightKg:774822  },
  { id:'B19', name:'Florești Est',     suburb:'Florești',    district:'Florești', lat:46.7550, lng:23.5900, fill:87.6, contaminated:false, fillRateMultiplier:1.85, monthlyWeightKg:774822  },
  { id:'B20', name:'Apahida Centru',   suburb:'Apahida',     district:'Apahida',  lat:46.8020, lng:23.6750, fill:67.9, contaminated:false, fillRateMultiplier:0.82, monthlyWeightKg:305893  },
  { id:'B21', name:'Apahida Vest',     suburb:'Apahida',     district:'Apahida',  lat:46.7990, lng:23.6680, fill:56.5, contaminated:false, fillRateMultiplier:0.82, monthlyWeightKg:305893  },
  { id:'B22', name:'Baciu Centru',     suburb:'Baciu',       district:'Baciu',    lat:46.7650, lng:23.5420, fill:47.7, contaminated:false, fillRateMultiplier:0.30, monthlyWeightKg:70210   },
  { id:'B23', name:'Baciu Est',        suburb:'Baciu',       district:'Baciu',    lat:46.7620, lng:23.5480, fill:60.7, contaminated:false, fillRateMultiplier:0.30, monthlyWeightKg:70210   },
  { id:'B24', name:'Gilău Centru',     suburb:'Gilău',       district:'Gilău',    lat:46.7380, lng:23.3800, fill:50.4, contaminated:false, fillRateMultiplier:0.30, monthlyWeightKg:66277   },
];

export const INITIAL_TRUCKS = [
  { id:'T1', label:'T1', lat:46.7712, lng:23.5895, color:'#3b82f6', districts:['Centru','Mănăștur'],                    routeIdx:0, route:[] },
  { id:'T2', label:'T2', lat:46.7850, lng:23.6100, color:'#8b5cf6', districts:['Mărăști','Someșeni'],                   routeIdx:0, route:[] },
  { id:'T3', label:'T3', lat:46.7580, lng:23.5780, color:'#06b6d4', districts:['Florești','Apahida','Baciu','Gilău'],   routeIdx:0, route:[] },
];

export const COLLECTION_SCHEDULE = {
  Centru:    { residual:[1,4], plastic:[2], paper:[3], glass:[6] },
  Mănăștur:  { residual:[2,5], plastic:[3], paper:[4], glass:[6] },
  Mărăști:   { residual:[1,4], plastic:[2], paper:[3], glass:[6] },
  Someșeni:  { residual:[3,6], plastic:[4], paper:[5], glass:[6] },
  Florești:  { residual:[2,5], plastic:[3], paper:[4], glass:[6] },
  Apahida:   { residual:[3,6], plastic:[4], paper:[5], glass:[6] },
  Baciu:     { residual:[2,5], plastic:[3], paper:[4], glass:[6] },
  Gilău:     { residual:[1,4], plastic:[2], paper:[3], glass:[6] },
};

export const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export const getScheduleToday = (district) => {
  const today = new Date().getDay();
  const s = COLLECTION_SCHEDULE[district];
  if (!s) return [];
  const types = [];
  if (s.residual?.includes(today)) types.push('residual');
  if (s.plastic?.includes(today))  types.push('plastic/metal');
  if (s.paper?.includes(today))    types.push('paper/carton');
  if (s.glass?.includes(today))    types.push('glass');
  return types;
};

export const getNextCollection = (district) => {
  const today = new Date().getDay();
  const s = COLLECTION_SCHEDULE[district];
  if (!s) return 'Unknown';
  const all = [...new Set([...s.residual,...s.plastic,...s.paper,...s.glass])].sort((a,b)=>a-b);
  const next = all.find(d => d > today) ?? all[0];
  return DAY_NAMES[next];
};

export const getScheduleMultiplier = (district) => {
  const today = new Date().getDay();
  const tomorrow = (today + 1) % 7;
  const s = COLLECTION_SCHEDULE[district];
  if (!s) return 1.0;
  const allDays = [...new Set([...(s.residual||[]),...(s.plastic||[])])];
  if (allDays.includes(today))    return 1.7;
  if (allDays.includes(tomorrow)) return 1.4;
  return 1.0;
};

export const SUBURB_TRENDS = {
  'Cluj-Napoca': { trend:'increasing', monthlyDeltaKg: 2719, avgMonthlyKg:686087 },
  'Florești':    { trend:'increasing', monthlyDeltaKg:  815, avgMonthlyKg:118374 },
  'Apahida':     { trend:'decreasing', monthlyDeltaKg: -237, avgMonthlyKg: 40185 },
  'Baciu':       { trend:'increasing', monthlyDeltaKg:  214, avgMonthlyKg:  9628 },
  'Gilău':       { trend:'increasing', monthlyDeltaKg:  168, avgMonthlyKg:  8340 },
};
