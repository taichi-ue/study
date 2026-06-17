async function checkAndShowReminder() {
  const settings = await dbGet('settings', 'app');
  if (!settings?.reminderEnabled) return;

  const now = new Date();
  const [hour, minute] = settings.reminderTime.split(':').map(Number);
  const reminderTime = new Date();
  reminderTime.setHours(hour, minute, 0, 0);

  if (now < reminderTime) return;

  const today = getLocalDateStr();
  if (settings.lastReminderShownDate === today) return;

  const todayLogs = await dbGetByIndex('studyLogs', 'date', today);
  if (todayLogs.length > 0) return;

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('学習の記録', {
      body: 'そろそろ今日の学習を記録しましょう！',
      icon: './icons/icon-192.png',
    });
  }

  await dbPut('settings', { ...settings, key: 'app', lastReminderShownDate: today });
}

async function updateAppBadge() {
  if (!('setAppBadge' in navigator)) return;

  const today = getLocalDateStr();
  const todayLogs = await dbGetByIndex('studyLogs', 'date', today);

  if (todayLogs.length === 0) {
    await navigator.setAppBadge(1);
  } else {
    await navigator.clearAppBadge();
  }
}

async function initializeNotifications() {
  await checkAndShowReminder();
  await updateAppBadge();
}
