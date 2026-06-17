let _currentCalendarMonth = new Date();

async function renderCalendar() {
  const el = document.getElementById('view-calendar');
  const year = _currentCalendarMonth.getFullYear();
  const month = _currentCalendarMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const logs = await dbGetAll('studyLogs');
  const categories = await dbGetAll('categories');
  const catMap = new Map(categories.map(c => [c.id, c]));

  const logsByDate = new Map();
  logs.forEach(log => {
    if (!logsByDate.has(log.date)) {
      logsByDate.set(log.date, []);
    }
    logsByDate.get(log.date).push(log);
  });

  const dates = Array.from(logsByDate.keys()).map(d => ({ date: d, duration: logsByDate.get(d).reduce((s, l) => s + l.durationMinutes, 0) }));
  const maxDuration = Math.max(...dates.map(d => d.duration), 0) || 60;

  const weeks = [];
  let week = [];
  for (let d = new Date(startDate); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dateStr = getLocalDateStr(d);
    const logData = logsByDate.get(dateStr);
    const duration = logData ? logData.reduce((s, l) => s + l.durationMinutes, 0) : 0;
    const intensity = duration > 0 ? Math.floor((duration / maxDuration) * 4) + 1 : 0;
    const isCurrentMonth = d.getMonth() === month;

    week.push({
      date: dateStr,
      day: d.getDate(),
      isCurrentMonth,
      intensity,
      duration,
      logs: logData || [],
    });

    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) weeks.push(week);

  const monthStr = `${year}年${month + 1}月`;
  const calendarHtml = weeks.map(w => `
    <div class="cal-week">
      ${w.map(d => `
        <button class="cal-day cal-intensity-${d.intensity} ${d.isCurrentMonth ? '' : 'cal-other-month'}" data-date="${d.date}" ${d.isCurrentMonth ? '' : 'disabled'} type="button">
          ${d.day}
        </button>
      `).join('')}
    </div>
  `).join('');

  el.innerHTML = `
    <div class="calendar-header">
      <button class="cal-nav" id="cal-prev" type="button">&lt;</button>
      <div class="cal-month">${monthStr}</div>
      <button class="cal-nav" id="cal-next" type="button">&gt;</button>
    </div>
    <div class="calendar-weekdays">
      <div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div>
    </div>
    <div class="calendar-grid">
      ${calendarHtml}
    </div>
  `;

  document.getElementById('cal-prev').addEventListener('click', () => {
    _currentCalendarMonth.setMonth(_currentCalendarMonth.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    _currentCalendarMonth.setMonth(_currentCalendarMonth.getMonth() + 1);
    renderCalendar();
  });

  document.querySelectorAll('.cal-day:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => showCalendarDayModal(btn.dataset.date, logsByDate.get(btn.dataset.date) || [], catMap));
  });
}

function showCalendarDayModal(date, logs, catMap) {
  const logsHtml = logs.length === 0
    ? '<p class="placeholder">記録がありません</p>'
    : logs.map(log => `
      <div class="log-item-modal">
        <div class="log-category" style="background: ${catMap.get(log.categoryId)?.color || '#ccc'}; color: #fff; display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 12px;">
          ${catMap.get(log.categoryId)?.name || '?'}
        </div>
        <div class="log-duration">${log.durationMinutes}分</div>
        ${log.memo ? `<div class="log-memo">${log.memo}</div>` : ''}
      </div>
    `).join('');

  const html = `
    <div class="modal" id="day-modal">
      <div class="modal-content">
        <h3>${date}</h3>
        ${logsHtml}
        <button id="modal-close" type="button" style="margin-top: 16px;">閉じる</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('day-modal').remove();
  });
}
