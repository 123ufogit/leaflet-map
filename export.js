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

/* --- 樹高プロファイルだけ PNG 保存 --- */
function exportTreeProfileAsImage() {
  // 横断面
  let canvas = document.getElementById("heightScatter");

  // なければ縦断面
  if (!canvas) {
    canvas = document.getElementById("heightScatterVertical");
  }

  if (!canvas) {
    alert("樹高プロファイルがありません。");
    return;
  }

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = "tree_profile.png";
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
    <button class="export-btn" onclick="exportTreeProfileAsImage()">樹高プロファイルを画像保存</button>
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
