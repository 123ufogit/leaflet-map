/* ============================================================
   mapinfo.js  —  情報レイヤ（周辺施設 + TLSエリアリンク）
   + サイドバー汎用エクスポート機能（テキスト/画像）
   + エクスポートボタン自動挿入
   ============================================================ */

/* ------------------------------------------------------------
   0. レイヤ宣言（初期は非表示）
   ------------------------------------------------------------ */

const layerShuuhen = L.layerGroup();      // 周辺施設（初期非表示）
const layerTLSinfo = L.layerGroup().addTo(map);      // TLSエリア中心リンク（初期非表示）


/* ------------------------------------------------------------
   1. 周辺施設レイヤ（points.geojson）
   ------------------------------------------------------------ */

fetch("data/points.geojson")
  .then(res => res.json())
  .then(json => {
    L.geoJSON(json, {
      pointToLayer: (feature, latlng) => {
        const p = feature.properties;
        let html = "";

        // ① name（中央寄せタイトル）
        if (p.name) {
          html += `
            <div style="text-align:center; font-weight:bold; font-size:16px; margin-bottom:4px;">
              ${p.name}
            </div>
          `;
        }

        // ② address
        if (p.address) {
          html += `
            <div style="font-size:13px; color:#555; margin-bottom:4px;">
              ${p.address}
            </div>
          `;
        }

        // ③ phone（スマホで発信できるリンク）
        if (p.phone) {
          html += `
            <div style="font-size:13px; margin-bottom:4px;">
              <a href="tel:${p.phone}" style="color:#0066cc;">
                ${p.phone}
              </a>
            </div>
          `;
        }

        // ④ Google マップリンク
        if (p.url && feature.geometry && feature.geometry.coordinates) {
          const [lng, lat] = feature.geometry.coordinates;
          const gmap = `https://www.google.com/maps?q=${lat},${lng}`;

          html += `
            <div style="margin-top:6px;">
              <a href="${gmap}" target="_blank" style="color:#0066cc;">
                Googleマップで開く
              </a>
            </div>
          `;
        }

        return L.marker(latlng).bindPopup(html);
      }
    }).eachLayer(layer => layerShuuhen.addLayer(layer));
  });


/* ------------------------------------------------------------
   2. TLSエリアの中心にリンク付きポップアップを配置
   ------------------------------------------------------------ */

fetch("data/TLS_area.geojson")
  .then(res => res.json())
  .then(json => {

    json.features.forEach(f => {
      const name = f.properties["エリア"];
      if (!name) return;

      // ポリゴンの中心点（centroid）
      const centroid = turf.centroid(f);
      const [lng, lat] = centroid.geometry.coordinates;

      // treebrowse.html のリンク
      const link = `https://123ufogit.github.io/leaflet-map/treebrowse.html?lat=${lat}&lng=${lng}&area=${encodeURIComponent(name)}`;

      // ポップアップ HTML
      const html = `
        <div style="text-align:center;">
          <b>森林調査：${name}</b><br>
          <a href="${link}" target="_blank" style="color:#0066cc;">
            このエリアの詳細を見る
          </a>
        </div>
      `;

      L.marker([lat, lng])
        .bindPopup(html)
        .addTo(layerTLSinfo);
    });
  });


/* ------------------------------------------------------------
   3. レイヤコントロールに登録（初期は非表示）
   ------------------------------------------------------------ */

L.control.layers(
  null,
  {
    "周辺施設": layerShuuhen,
    "TLSエリア（リンク）": layerTLSinfo
  },
  { position: "bottomleft" }
).addTo(map);


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
