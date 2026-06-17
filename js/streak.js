async function getCurrentStreak() {
  const logs = await dbGetAll('studyLogs');
  const dates = [...new Set(logs.map(l => l.date))].sort().reverse();

  if (dates.length === 0) return { current: 0, longest: 0 };

  const today = getLocalDateStr();
  const hasToday = dates[0] === today;

  let current = 0;
  let checkDate = hasToday ? today : prevDateStr(today);

  for (const d of dates) {
    if (dateDiffDays(checkDate, d) === 0) {
      current++;
      checkDate = prevDateStr(d);
    } else {
      break;
    }
  }

  let longest = 0;
  let count = 1;
  for (let i = 0; i < dates.length - 1; i++) {
    if (dateDiffDays(dates[i], dates[i + 1]) === 1) {
      count++;
      longest = Math.max(longest, count);
    } else {
      longest = Math.max(longest, count);
      count = 1;
    }
  }
  longest = Math.max(longest, count, current);

  return { current, longest };
}

async function getTodayLogsCount() {
  const today = getLocalDateStr();
  const logs = await dbGetByIndex('studyLogs', 'date', today);
  return logs.length;
}

async function getWeeklyTotal() {
  const logs = await dbGetAll('studyLogs');
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const todayStr = getLocalDateStr(today);
  const weekStartStr = getLocalDateStr(weekStart);

  return logs
    .filter(l => l.date >= weekStartStr && l.date <= todayStr)
    .reduce((sum, l) => sum + l.durationMinutes, 0);
}
