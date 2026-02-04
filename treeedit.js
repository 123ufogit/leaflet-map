/*
  treeedit.js version 1.1.0 (Area-aware)
  - treeplot.js を変更せずに編集機能を追加
  - localStorage によるオフライン永続保存
  - エリアごとに編集内容を分離
  - エリアごとに GitHub アップロード先を自動切替
  - 編集が1件以上あるときだけ GitHub アイコン表示
  - スマホ対応（ドラッグ不要）
*/

/* ===== 永続化キー（エリア別） ===== */
function getStorageKey() {
  return `treeEdits_${currentArea || "default"}`;
}

function loadEdits() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveEdits(edits) {
  localStorage.setItem(getStorageKey(), JSON.stringify(edits));
}

/* ===== メモリ保持 ===== */
let treeMemory = {};
let treeHeader = [];
let editsCache = loadEdits();

/* ===== trees.csv を読み込んでメモリに保持 ===== */
async function loadTreeMemory() {
  const path = currentArea
    ? `data/${currentArea}/trees.csv`
    : "data/trees.csv";

  try {
    const res = await fetch(path);
    const text = await res.text();

    const lines = text.trim().split("\n");
    treeHeader = lines[0].split(",");
    treeMemory = {};

    lines.slice(1).forEach(line => {
      if (!line.trim()) return;
      const cols = line.split(",");
      const row = {};
      treeHeader.forEach((k, i) => row[k] = cols[i]);

      const id = row["立木ID"];
      if (!id) return;

      if (editsCache[id]) Object.assign(row, editsCache[id]);

      treeMemory[id] = row;
    });
  } catch (e) {
    console.error("Failed to load trees.csv", e);
  }
}

loadTreeMemory();

/* ===== GitHub アップロード先（エリア別） ===== */
function getUploadURL() {
  if (!currentArea)
    return "https://github.com/123ufogit/leaflet-map/upload/main/data";

  return `https://github.com/123ufogit/leaflet-map/upload/main/data/${currentArea}`;
}

/* ===== GitHub アイコン（編集があるときだけ表示） ===== */
let githubControl = null;

const GitHubControl = L.Control.extend({
  onAdd: function () {
    const div = L.DomUtil.create("div", "github-upload-btn");

    div.innerHTML = `
      <div style="
        width:40px;
        height:40px;
        background:#24292e;
        border-radius:6px;
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        box-shadow:0 1px 4px rgba(0,0,0,0.4);
      ">
        <img src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
             style="width:24px;height:24px;">
      </div>
    `;

    L.DomEvent.disableClickPropagation(div);

    div.onclick = () => {
      exportEditedCSV();
      window.open(getUploadURL(), "_blank");
    };

    return div;
  }
});

function updateGitHubButtonVisibility() {
  const hasEdits = Object.keys(editsCache).length > 0;

  if (hasEdits && !githubControl) {
    githubControl = new GitHubControl({ position: "topright" });
    githubControl.addTo(map);
  }

  if (!hasEdits && githubControl) {
    map.removeControl(githubControl);
    githubControl = null;
  }
}

updateGitHubButtonVisibility();

/* ===== popupopen をフックして編集 UI を注入 ===== */
map.on("popupopen", async (e) => {
  const popup = e.popup;
  const node = popup._contentNode;
  if (!node) return;

  const idMatch = node.innerHTML.match(/立木ID：<\/strong>([^<]+)/);
  if (!idMatch) return;

  const id = idMatch[1].trim();

  if (!treeMemory[id]) await loadTreeMemory();

  const base = treeMemory[id];
  if (!base) return;

  const current = editsCache[id] ? { ...base, ...editsCache[id] } : base;

  const html = `
    <div style="min-width:220px;">
      <div><strong>立木ID：</strong>${current["立木ID"]}</div>
      <div><strong>樹種：</strong>${current["樹種"]}</div>
      <div><strong>間伐：</strong>${current["間伐"]}</div>
      <hr style="margin:6px 0;">
      <button id="open-edit-form"
        style="padding:6px 10px; background:#2c3e50; color:white; border:none; border-radius:4px;">
        編集
      </button>
      ${editsCache[id] ? `<div style="margin-top:4px; font-size:11px; color:#27ae60;">編集済み</div>` : ""}
    </div>
  `;

  popup.setContent(html);

  setTimeout(() => {
    const btn = document.getElementById("open-edit-form");
    if (btn) btn.onclick = () => openEditForm(id, popup.getLatLng());
  }, 0);
});

/* ===== 編集フォーム ===== */
function openEditForm(id, latlng) {
  const base = treeMemory[id];
  const current = editsCache[id] ? { ...base, ...editsCache[id] } : base;

  const html = `
    <div style="min-width:230px;">
      <h4 style="margin:0 0 8px;">属性編集</h4>

      <div><strong>立木ID：</strong>${current["立木ID"]}</div>

      <label style="display:block; margin-bottom:8px;">
        樹種：
        <select id="edit-species" style="width:100%; margin-top:2px;">
          <option ${current["樹種"]==="スギ"?"selected":""}>スギ</option>
          <option ${current["樹種"]==="アテ"?"selected":""}>アテ</option>
          <option ${current["樹種"]==="その他"?"selected":""}>その他</option>
        </select>
      </label>

      <label style="display:block; margin-bottom:12px;">
        間伐：
        <select id="edit-kamba" style="width:100%; margin-top:2px;">
          <option value="0" ${current["間伐"]==="0"?"selected":""}>残す</option>
          <option value="1" ${current["間伐"]==="1"?"selected":""}>伐る</option>
        </select>
      </label>

      <button id="save-edit"
        style="padding:6px 10px; background:#27ae60; color:white; border:none; border-radius:4px;">
        保存
      </button>
    </div>
  `;

  L.popup()
    .setLatLng(latlng)
    .setContent(html)
    .openOn(map);

  setTimeout(() => {
    const saveBtn = document.getElementById("save-edit");
    if (!saveBtn) return;

    saveBtn.onclick = () => {
      const species = document.getElementById("edit-species").value;
      const kamba   = document.getElementById("edit-kamba").value;

      const updated = { ...base, 樹種: species, 間伐: kamba };
      treeMemory[id] = updated;

      editsCache[id] = {
        立木ID: updated["立木ID"],
        樹種:   updated["樹種"],
        間伐:   updated["間伐"]
      };

      saveEdits(editsCache);
      updateGitHubButtonVisibility();

      alert("編集内容を保存しました（オフラインでも保持されます）");

      L.popup()
        .setLatLng(latlng)
        .setContent(`
          <div style="min-width:220px;">
            <div><strong>立木ID：</strong>${updated["立木ID"]}</div>
            <div><strong>樹種：</strong>${updated["樹種"]}</div>
            <div><strong>間伐：</strong>${updated["間伐"]}</div>
            <hr style="margin:6px 0;">
            <button id="open-edit-form"
              style="padding:6px 10px; background:#2c3e50; color:white; border:none; border-radius:4px;">
              編集
            </button>
            <div style="margin-top:4px; font-size:11px; color:#27ae60;">編集済み</div>
          </div>
        `)
        .openOn(map);

      setTimeout(() => {
        const btn = document.getElementById("open-edit-form");
        if (btn) btn.onclick = () => openEditForm(id, latlng);
      }, 0);
    };
  }, 0);
}

/* ===== 編集後 CSV をエクスポート（エリア別） ===== */
function exportEditedCSV() {
  if (!treeHeader.length) return;

  let csv = treeHeader.join(",") + "\n";

  Object.keys(treeMemory).forEach(id => {
    const row = treeMemory[id];
    const line = treeHeader.map(h => (row[h] ?? "")).join(",");
    csv += line + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = currentArea
    ? `trees_${currentArea}_edited.csv`
    : "trees_edited.csv";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

window.exportEditedCSV = exportEditedCSV;
