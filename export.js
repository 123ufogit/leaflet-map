/* ============================================================
   export.js — サイドバー汎用エクスポート機能（最新版）
   ============================================================ */

/* --- テキストをクリップボードにコピー --- */
function exportSidebarAsText() {
  const content = document.getElementById("attrContent").innerText;

  navigator.clipboard.writeText(content)
    .then(() => {
      console.log("サイドバー内容をコピーしました");
    })
    .catch(err => {
      console.error("コピーに失敗:", err);
    });
}

/* --- 東西＋南北プロファイルを合成 PNG 保存 --- */
function exportCombinedTreeProfile() {
  // drawtree.js 内の合成関数を呼び出す
  const combo = combineProfilesToOneImage();

  if (!combo) {
    alert("樹高プロファイルがありません。");
    return;
  }

  const link = document.createElement("a");
  link.href = combo.toDataURL("image/png");
  link.download = "tree_profile_combined.png";
  link.click();
}

/* --- ボタン自動挿入 --- */
function injectExportButtons() {
  const box = document.getElementById("attrContent");

  // 既存のボタンを削除
  const old = document.getElementById("exportButtons");
  if (old) old.remove();

  const div = document.createElement("div");
  div.id = "exportButtons";
  div.style.marginTop = "14px";

  div.innerHTML = `
    <button class="export-btn" onclick="exportSidebarAsText()">テキストをコピー</button>
    <button class="export-btn" onclick="exportCombinedTreeProfile()">樹高プロファイル画像（合成）を保存</button>
  `;

  box.appendChild(div);
}

/* --- CSS（ボタンの見た目） --- */
const style = document.createElement("style");
style.textContent = `
  #exportButtons .export-btn {
    padding: 6px 10px;
    margin-right: 6px;
    background: #0066ff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  #exportButtons .export-btn:hover {
    background: #004ecc;
  }
`;
document.head.appendChild(style);
