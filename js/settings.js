async function renderSettings() {
  const el = document.getElementById('view-settings');
  const settings = await dbGet('settings', 'app') || {};

  el.innerHTML = `
    <div class="settings-section">
      <h3>週次目標</h3>
      <div class="form-group">
        <label>目標学習時間（分/週）</label>
        <input type="number" id="weekly-target" min="0" step="30" value="${settings.weeklyTargetMinutes || 0}">
        <small style="color: #888; display: block; margin-top: 4px;">例: 300分は週5時間</small>
      </div>
      <button class="btn-primary" id="save-weekly-target">保存</button>
    </div>

    <div class="settings-section">
      <h3>リマインド通知</h3>
      <div class="form-group">
        <label>
          <input type="checkbox" id="reminder-enabled" ${settings.reminderEnabled ? 'checked' : ''}>
          通知を有効にする
        </label>
      </div>
      <div class="form-group">
        <label>通知時刻</label>
        <input type="time" id="reminder-time" value="${settings.reminderTime || '21:00'}">
      </div>
      <button class="btn-primary" id="save-reminder">保存</button>

      <div id="notification-status" style="margin-top: 16px; padding: 12px; background: #f5f6f8; border-radius: 6px;">
        <div style="font-size: 14px; margin-bottom: 8px;">通知の許可状態:</div>
        <div id="permission-status" style="font-size: 13px;"></div>
        <button class="btn-primary" id="request-permission" style="margin-top: 8px;" type="button">許可をリクエスト</button>
      </div>
    </div>
  `;

  updateNotificationStatus();
  document.getElementById('save-weekly-target').addEventListener('click', saveWeeklyTarget);
  document.getElementById('save-reminder').addEventListener('click', saveReminder);
  document.getElementById('request-permission').addEventListener('click', requestNotificationPermission);
}

async function saveWeeklyTarget() {
  const target = parseInt(document.getElementById('weekly-target').value);
  if (target < 0) {
    alert('0以上の値を入力してください');
    return;
  }
  const settings = await dbGet('settings', 'app') || {};
  await dbPut('settings', { ...settings, key: 'app', weeklyTargetMinutes: target });
  alert('保存しました');
  // ホーム画面を再描画して達成率を反映
  if (document.getElementById('view-home').hidden === false) {
    renderHome();
  }
}

async function saveReminder() {
  const enabled = document.getElementById('reminder-enabled').checked;
  const time = document.getElementById('reminder-time').value;
  const settings = await dbGet('settings', 'app') || {};
  await dbPut('settings', { ...settings, key: 'app', reminderEnabled: enabled, reminderTime: time });
  alert('保存しました');
}

function updateNotificationStatus() {
  const statusEl = document.getElementById('permission-status');
  const btnEl = document.getElementById('request-permission');

  if (!('Notification' in window)) {
    statusEl.textContent = 'このブラウザは通知機能に対応していません';
    btnEl.disabled = true;
    return;
  }

  switch (Notification.permission) {
    case 'granted':
      statusEl.textContent = '✓ 通知が許可されています';
      btnEl.textContent = '許可済み';
      btnEl.disabled = true;
      break;
    case 'denied':
      statusEl.textContent = '✗ 通知が拒否されています（設定から有効にしてください）';
      btnEl.disabled = true;
      break;
    default:
      statusEl.textContent = '- 未確認（リクエストボタンをタップしてください）';
      btnEl.textContent = '許可をリクエスト';
      btnEl.disabled = false;
  }
}

async function requestNotificationPermission() {
  try {
    await Notification.requestPermission();
    updateNotificationStatus();
  } catch (error) {
    console.error(error);
    alert('通知権限の取得に失敗しました');
  }
}
