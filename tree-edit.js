/* ============================================================
   tree-edit.js — Leaflet 上で tree.csv を編集する UI
   ============================================================ */

/* ===== tree-db.js の関数をグローバルから参照 ===== */
/* saveTree(), queueEdit() は tree-db.js 内で window に登録しておく必要あり */

function openTreeEditForm(tree) {

  const html = `
    <div style="min-width:180px;">
      <h3 style="margin-top:0;">立木編集</h3>

      <label>DBH (cm)：<br>
        <input id="edit-dbh" type="number" value="${tree.DBH}" style="width:100%;">
      </label><br><br>

      <label>樹高 (m)：<br>
        <input id="edit-height" type="number" value="${tree.Height}" style="width:100%;">
      </label><br><br>

      <label>材積 (m³)：<br>
        <input id="edit-volume" type="number" value="${tree.Volume}" style="width:100%;">
      </label><br><br>

      <label>コメント：<br>
        <input id="edit-comment" type="text" value="${tree.Comment || ""}" style="width:100%;">
      </label><br><br>

      <button id="save-tree-btn" style="width:100%; padding:6px;">保存</button>
    </div>
  `;

  // ポップアップを開く
  const popup = L.popup()
    .setLatLng([tree.lat, tree.lon])
    .setContent(html)
    .openOn(map);

  // 保存ボタンの処理
  setTimeout(() => {
    document.getElementById("save-tree-btn").onclick = async () => {

      const newDBH = Number(document.getElementById("edit-dbh").value);
      const newHeight = Number(document.getElementById("edit-height").value);
      const newVolume = Number(document.getElementById("edit-volume").value);
      const newComment = document.getElementById("edit-comment").value;

      const changes = {};
      if (tree.DBH !== newDBH) changes.DBH = newDBH;
      if (tree.Height !== newHeight) changes.Height = newHeight;
      if (tree.Volume !== newVolume) changes.Volume = newVolume;
      if (tree.Comment !== newComment) changes.Comment = newComment;

      if (Object.keys(changes).length === 0) {
        alert("変更はありません");
        return;
      }

      Object.assign(tree, changes);

      // IndexedDB に保存
      await saveTree(tree);

      // 同期キューに追加
      await queueEdit({
        id: tree.id,
        area: tree.area,
        changes,
        timestamp: Date.now()
      });

      alert("ローカルに保存しました（オフライン対応）");
      map.closePopup();
    };
  }, 100);
}
