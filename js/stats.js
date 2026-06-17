let _statsPeriod = 'month';

async function renderStats() {
  const el = document.getElementById('view-stats');
  const categories = await dbGetAll('categories');
  const logs = await dbGetAll('studyLogs');

  const catMap = new Map(categories.map(c => [c.id, c]));
  const today = new Date();
  const todayStr = getLocalDateStr(today);
  let startStr;

  switch (_statsPeriod) {
    case 'week': {
      const ws = new Date(today);
      ws.setDate(today.getDate() - today.getDay());
      startStr = getLocalDateStr(ws);
      break;
    }
    case 'month': {
      startStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
      break;
    }
    case 'all':
    default: {
      startStr = logs.length > 0
        ? logs.map(l => l.date).sort()[0]
        : todayStr;
      break;
    }
  }

  const filteredLogs = logs.filter(l => l.date >= startStr && l.date <= todayStr);

  const byCategory = new Map();
  categories.forEach(c => byCategory.set(c.id, 0));
  filteredLogs.forEach(l => {
    byCategory.set(l.categoryId, (byCategory.get(l.categoryId) || 0) + l.durationMinutes);
  });

  const sortedCats = Array.from(categories)
    .sort((a, b) => (byCategory.get(b.id) || 0) - (byCategory.get(a.id) || 0));

  const catListHtml = sortedCats.map(c => {
    const duration = byCategory.get(c.id) || 0;
    return `
      <div class="stat-cat-item">
        <div class="stat-cat-color" style="background: ${c.color};"></div>
        <div class="stat-cat-name">${c.name}</div>
        <div class="stat-cat-duration">${duration}分</div>
      </div>
    `;
  }).join('');

  const chartHtml = generateChart(logs, _statsPeriod);

  el.innerHTML = `
    <div class="stats-period">
      <button class="period-btn ${_statsPeriod === 'week' ? 'active' : ''}" data-period="week" type="button">週</button>
      <button class="period-btn ${_statsPeriod === 'month' ? 'active' : ''}" data-period="month" type="button">月</button>
      <button class="period-btn ${_statsPeriod === 'all' ? 'active' : ''}" data-period="all" type="button">全期間</button>
    </div>

    <div class="stats-section">
      <h3>カテゴリ別合計</h3>
      <div id="cat-list">
        ${sortedCats.length === 0 ? '<p class="placeholder">データがありません</p>' : catListHtml}
      </div>
    </div>

    <div class="stats-section">
      <h3>推移グラフ</h3>
      <div id="chart-container">
        ${chartHtml}
      </div>
    </div>
  `;

  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _statsPeriod = btn.dataset.period;
      renderStats();
    });
  });
}

function generateChart(logs, period) {
  const dataPoints = [];

  if (period === 'week') {
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = getLocalDateStr(d);
      const total = logs
        .filter(l => l.date === dateStr)
        .reduce((s, l) => s + l.durationMinutes, 0);
      dataPoints.push({ label: d.getDate() + '日', value: total });
    }
  } else if (period === 'month') {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const total = logs
        .filter(l => l.date === dateStr)
        .reduce((s, l) => s + l.durationMinutes, 0);
      dataPoints.push({ label: day + '日', value: total });
    }
  } else {
    const byMonth = new Map();
    logs.forEach(l => {
      const ym = l.date.substring(0, 7);
      byMonth.set(ym, (byMonth.get(ym) || 0) + l.durationMinutes);
    });
    Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .forEach(([ym, value]) => {
        const [y, m] = ym.split('-');
        dataPoints.push({ label: m + '月', value });
      });
  }

  if (dataPoints.length === 0) {
    return '<p class="placeholder">データがありません</p>';
  }

  const maxValue = Math.max(...dataPoints.map(p => p.value), 60) || 60;
  const barWidth = Math.min(30, 300 / dataPoints.length);
  const width = dataPoints.length * (barWidth + 8) + 40;
  const height = 250;

  const bars = dataPoints.map((p, i) => {
    const barHeight = (p.value / maxValue) * (height - 60);
    const x = 30 + i * (barWidth + 8);
    const y = height - 40 - barHeight;
    return `
      <g>
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#4C6EF5" rx="3"/>
        <text x="${x + barWidth / 2}" y="${height - 15}" text-anchor="middle" font-size="11" fill="#666">${p.label}</text>
        <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="10" fill="#333" font-weight="bold">${p.value}</text>
      </g>
    `;
  }).join('');

  return `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="max-width: 100%; margin: 0 auto; display: block;">
      <g>
        <line x1="25" y1="20" x2="25" y2="${height - 40}" stroke="#ddd" stroke-width="1"/>
        <line x1="25" y1="${height - 40}" x2="${width}" y2="${height - 40}" stroke="#ddd" stroke-width="1"/>
      </g>
      ${bars}
    </svg>
  `;
}
