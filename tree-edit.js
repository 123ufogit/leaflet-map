/* ============================================================
   tree-edit.js — Leaflet 上で tree.csv を編集する UI
   ============================================================ */

import { saveTree, queueEdit } from "./tree-db.js";

/* ============================================================
   マーカーに編集フォームを付与
   ============================================================ */

export function enableTreeEditing(marker) {
  const tree = marker.treeData;

  marker.on("click", () => {
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

    marker.bindPopup(html).openPopup();

    setTimeout(() => {
      document.getElementById("save-tree-btn").onclick = async () => {
        const newDBH = Number(document.getElementById("edit-dbh").value);
        const newHeight = Number(document.getElementById("edit-height").value);
        const newVolume = Number(document.getElementById("edit-volume").value);
        const newComment = document.getElementById("edit-comment").value;

        /* ===== 変更内容を treeData に反映 ===== */
        const changes = {};
        if (tree.DBH !== newDBH) changes.DBH = newDBH;
        if (tree.Height !== newHeight) changes.Height = newHeight;
        if (tree.Volume !== newVolume) changes.Volume = newVolume;
        if (tree.Comment !== newComment) changes.Comment = newComment;

        // 変更がなければ何もしない
        if (Object.keys(changes).length === 0) {
          alert("変更はありません");
          return;
        }

        // treeData を更新
        Object.assign(tree, changes);

        /* ===== IndexedDB に保存 ===== */
        await saveTree(tree);

        /* ===== 編集キューに追加（後で一括送信） ===== */
        await queueEdit({
          id: tree.id,
          changes,
          timestamp: Date.now()
        });

        alert("ローカルに保存しました（オフライン対応）");
        marker.closePopup();
      };
    }, 100);
  });
}
