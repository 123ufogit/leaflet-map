/* ============================================================
   export.js — サイドバー汎用エクスポート機能
   ============================================================ */

/* --- テキスト出力 --- */
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

/* --- 画像出力 --- */
function exportSidebarAsImage() {
  const target = document.getElementById("attrContent");

  html2canvas(target).then(canvas => {
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "sidebar.png";
    link.click();
  });
}

/* --- ボタン自動挿入 --- */
function injectExportButtons() {
  const box = document.getElementById("attrContent");

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

/* --- CSS --- */
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
