async function renderHome() {
  const el = document.getElementById('view-home');
  const categories = await dbGetAll('categories');
  const streak = await getCurrentStreak();
  const todayCount = await getTodayLogsCount();
  const recentLogs = await dbGetAll('studyLogs');
  recentLogs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const recent5 = recentLogs.slice(0, 5);
  const catMap = new Map(categories.map(c => [c.id, c]));
  const settings = await dbGet('settings', 'app');
  const weeklyTotal = await getWeeklyTotal();
  const weeklyTarget = settings?.weeklyTargetMinutes || 0;
  const achievementRate = weeklyTarget > 0 ? Math.min(100, Math.round((weeklyTotal / weeklyTarget) * 100)) : 0;

  const today = getLocalDateStr();
  const catOptions = categories
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(c => `<option value="${c.id}">${c.name}</option>`)
    .join('');

  el.innerHTML = `
    <div class="home-streak">
      <div class="streak-item">
        <div class="streak-label">継続日数</div>
        <div class="streak-value">${streak.current}日</div>
      </div>
      <div class="streak-item">
        <div class="streak-label">過去最長</div>
        <div class="streak-value">${streak.longest}日</div>
      </div>
    </div>

    ${todayCount === 0 ? '<div class="home-warning">本日はまだ記録していません</div>' : ''}

    ${weeklyTarget > 0 ? `
      <div class="home-goal">
        <div class="goal-label">今週の目標</div>
        <div class="goal-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${achievementRate}%"></div>
          </div>
          <div class="progress-text">${weeklyTotal}分 / ${weeklyTarget}分 (${achievementRate}%)</div>
        </div>
      </div>
    ` : ''}

    <div class="home-form">
      <h3>学習を記録</h3>
      <div class="form-group">
        <label>日付</label>
        <input type="date" id="log-date" value="${today}">
      </div>
      <div class="form-group">
        <label>カテゴリ</label>
        <select id="log-category">
          <option value="">選択してください</option>
          ${catOptions}
        </select>
      </div>
      <div class="form-group">
        <label>学習時間（分）</label>
        <input type="number" id="log-duration" min="1" placeholder="例: 30">
      </div>
      <div class="form-group">
        <label>メモ（任意）</label>
        <textarea id="log-memo" placeholder="例: フレームワークの基本をまとめた" rows="2"></textarea>
      </div>
      <button class="btn-primary btn-large" id="log-submit">記録する</button>
    </div>

    <div class="home-recent">
      <h3>直近の記録</h3>
      <div id="recent-list">
        ${recent5.length === 0 ? '<p class="placeholder">記録がありません</p>' : ''}
        ${recent5.map((log, idx) => {
          const cat = catMap.get(log.categoryId);
          return `
            <div class="log-item" data-id="${log.id}">
              <div class="log-info">
                <div class="log-date">${log.date}</div>
                <div class="log-category" style="background: ${cat?.color || '#ccc'}; color: #fff; display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 12px;">
                  ${cat?.name || '?'}
                </div>
                <div class="log-duration">${log.durationMinutes}分</div>
                ${log.memo ? `<div class="log-memo">${log.memo}</div>` : ''}
              </div>
              <div class="log-actions">
                <button class="btn-edit" data-id="${log.id}" type="button">編集</button>
                <button class="btn-delete" data-id="${log.id}" type="button">削除</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById('log-submit').addEventListener('click', handleSubmitLog);
  document.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => handleEditLog(btn.dataset.id));
  });
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteLog(btn.dataset.id));
  });
}

async function handleSubmitLog() {
  const date = document.getElementById('log-date').value;
  const categoryId = parseInt(document.getElementById('log-category').value);
  const duration = parseInt(document.getElementById('log-duration').value);
  const memo = document.getElementById('log-memo').value;

  if (!date || !categoryId || !duration) {
    alert('日付、カテゴリ、学習時間を入力してください');
    return;
  }

  if (duration <= 0) {
    alert('学習時間は1分以上を入力してください');
    return;
  }

  try {
    await dbAdd('studyLogs', {
      date,
      categoryId,
      durationMinutes: duration,
      memo: memo || '',
      createdAt: new Date().toISOString(),
    });
    document.getElementById('log-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('log-category').value = '';
    document.getElementById('log-duration').value = '';
    document.getElementById('log-memo').value = '';
    renderHome();
  } catch (error) {
    console.error(error);
    alert('記録に失敗しました');
  }
}

async function handleEditLog(id) {
  const log = await dbGet('studyLogs', parseInt(id));
  const categories = await dbGetAll('categories');
  const catOptions = categories
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(c => `<option value="${c.id}" ${c.id === log.categoryId ? 'selected' : ''}>${c.name}</option>`)
    .join('');

  const html = `
    <div class="modal" id="edit-modal">
      <div class="modal-content">
        <h3>記録を編集</h3>
        <div class="form-group">
          <label>日付</label>
          <input type="date" id="edit-date" value="${log.date}">
        </div>
        <div class="form-group">
          <label>カテゴリ</label>
          <select id="edit-category">
            ${catOptions}
          </select>
        </div>
        <div class="form-group">
          <label>学習時間（分）</label>
          <input type="number" id="edit-duration" min="1" value="${log.durationMinutes}">
        </div>
        <div class="form-group">
          <label>メモ</label>
          <textarea id="edit-memo" rows="2">${log.memo}</textarea>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-primary" id="edit-save" type="button">保存</button>
          <button id="edit-cancel" type="button">キャンセル</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById('edit-modal');

  document.getElementById('edit-save').addEventListener('click', async () => {
    const newDate = document.getElementById('edit-date').value;
    const newCategoryId = parseInt(document.getElementById('edit-category').value);
    const newDuration = parseInt(document.getElementById('edit-duration').value);
    const newMemo = document.getElementById('edit-memo').value;

    if (!newDate || !newCategoryId || !newDuration) {
      alert('必須項目を入力してください');
      return;
    }

    await dbPut('studyLogs', {
      id: parseInt(id),
      date: newDate,
      categoryId: newCategoryId,
      durationMinutes: newDuration,
      memo: newMemo,
      createdAt: log.createdAt,
    });

    modal.remove();
    renderHome();
  });

  document.getElementById('edit-cancel').addEventListener('click', () => {
    modal.remove();
  });
}

async function handleDeleteLog(id) {
  if (confirm('この記録を削除しますか？')) {
    await dbDelete('studyLogs', parseInt(id));
    renderHome();
  }
}
