async function renderCategories() {
  const el = document.getElementById('view-categories');
  const categories = await dbGetAll('categories');
  const logs = await dbGetAll('studyLogs');

  const usedCatIds = new Set(logs.map(l => l.categoryId));
  const sortedCats = categories.sort((a, b) => a.sortOrder - b.sortOrder);

  const catListHtml = sortedCats.map((cat, idx) => {
    const isUsed = usedCatIds.has(cat.id);
    return `
      <div class="cat-item">
        <div class="cat-color" style="background: ${cat.color};"></div>
        <div class="cat-name">${cat.name}</div>
        <div class="cat-actions">
          <button class="btn-edit-cat" data-id="${cat.id}" type="button">編集</button>
          <button class="btn-delete-cat" data-id="${cat.id}" type="button" ${isUsed ? 'data-confirm=true' : ''}>削除</button>
        </div>
      </div>
    `;
  }).join('');

  el.innerHTML = `
    <div class="categories-list">
      <h3>カテゴリ一覧</h3>
      ${sortedCats.length === 0 ? '<p class="placeholder">カテゴリがありません</p>' : catListHtml}
    </div>

    <div class="category-form">
      <h3>カテゴリを追加</h3>
      <div class="form-group">
        <label>カテゴリ名</label>
        <input type="text" id="new-cat-name" placeholder="例: プログラミング">
      </div>
      <div class="form-group">
        <label>色</label>
        <input type="color" id="new-cat-color" value="#4C6EF5">
      </div>
      <button class="btn-primary" id="add-category" type="button">追加</button>
    </div>
  `;

  document.getElementById('add-category').addEventListener('click', handleAddCategory);
  document.querySelectorAll('.btn-edit-cat').forEach(btn => {
    btn.addEventListener('click', () => handleEditCategory(btn.dataset.id));
  });
  document.querySelectorAll('.btn-delete-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      const needsConfirm = btn.dataset.confirm === 'true';
      handleDeleteCategory(btn.dataset.id, needsConfirm);
    });
  });
}

async function handleAddCategory() {
  const name = document.getElementById('new-cat-name').value.trim();
  const color = document.getElementById('new-cat-color').value;

  if (!name) {
    alert('カテゴリ名を入力してください');
    return;
  }

  const maxSortOrder = Math.max(...(await dbGetAll('categories')).map(c => c.sortOrder || 0), 0);
  await dbAdd('categories', {
    name,
    color,
    sortOrder: maxSortOrder + 1,
  });

  document.getElementById('new-cat-name').value = '';
  renderCategories();
}

async function handleEditCategory(id) {
  const cat = await dbGet('categories', parseInt(id));
  const html = `
    <div class="modal" id="edit-cat-modal">
      <div class="modal-content">
        <h3>カテゴリを編集</h3>
        <div class="form-group">
          <label>カテゴリ名</label>
          <input type="text" id="edit-cat-name" value="${cat.name}">
        </div>
        <div class="form-group">
          <label>色</label>
          <input type="color" id="edit-cat-color" value="${cat.color}">
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-primary" id="edit-cat-save" type="button">保存</button>
          <button id="edit-cat-cancel" type="button">キャンセル</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);
  const modal = document.getElementById('edit-cat-modal');

  document.getElementById('edit-cat-save').addEventListener('click', async () => {
    const newName = document.getElementById('edit-cat-name').value.trim();
    const newColor = document.getElementById('edit-cat-color').value;

    if (!newName) {
      alert('カテゴリ名を入力してください');
      return;
    }

    await dbPut('categories', {
      id: parseInt(id),
      name: newName,
      color: newColor,
      sortOrder: cat.sortOrder,
    });

    modal.remove();
    renderCategories();
  });

  document.getElementById('edit-cat-cancel').addEventListener('click', () => {
    modal.remove();
  });
}

async function handleDeleteCategory(id, needsConfirm) {
  if (needsConfirm && !confirm('このカテゴリは記録で使用されています。本当に削除しますか？')) {
    return;
  }

  await dbDelete('categories', parseInt(id));
  renderCategories();
}
