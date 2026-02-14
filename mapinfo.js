/* ============================================================
   mapinfo.js version 0.9.3
   - サイドバー属性情報の管理
   - テキスト出力 / 画像出力（汎用）
   - エクスポートボタンの自動挿入
   ============================================================ */

/* ============================================================
   ★ 汎用：サイドバーの内容をテキストとしてエクスポート
   ============================================================ */
function exportSidebarAsText() {
  const content = document.getElementById("attrContent").innerText;

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "sidebar.txt";
  a.click();

  URL.revokeObjectURL(url);
}

/* ============================================================
   ★ 汎用：サイドバーの内容を画像としてエクスポート
   ============================================================ */
function exportSidebarAsImage() {
  const target = document.getElementById("attrContent");

  html2canvas(target).then(canvas => {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "sidebar.png";
    link.click();
  });
}

/* ============================================================
   ★ 汎用：エクスポートボタンを attrContent の末尾に自動挿入
   ============================================================ */
function injectExportButtons() {
  const box = document.getElementById("attrContent");

  // 既存ボタンがあれば削除（重複防止）
  const old = document.getElementById("exportButtons");
  if (old) old.remove();

  const div = document.createElement("div");
  div.id = "exportButtons";
  div.style.marginTop = "14px";

  div.innerHTML = `
    <button class="export-btn" onclick="exportSidebarAsText()">テキスト出力</button>
    <button class="export-btn" onclick="exportSidebarAsImage()">画像出力</button>
  `;

  box.appendChild(div);
}

/* ============================================================
   ★ CSS（Leaflet 風のボタン）
   ============================================================ */
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

/* ============================================================
   ★ 他の JS（treestat / drawtree / 将来の JS）が
     attrContent を更新した後に呼べば OK
   ============================================================ */
