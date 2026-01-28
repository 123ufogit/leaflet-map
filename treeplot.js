/*
  map.js version 0.9.1

  Contains:
    - 周辺施設レイヤ
    - CSVレイヤ（樹種色分け・間伐塗りつぶし切替）
    - レイヤコントロール（独立）
*/


/* ===== TLSエリア（WGS84 GeoJSON） ===== */
const layerTLS = L.layerGroup().addTo(map);  // CSV より前に追加 → 背面になる

fetch("data/TLS_area.geojson")
  .then(res => res.json())
  .then(json => {
    L.geoJSON(json, {
      style: {
        color: "#0066ff",   // 青いアウトライン
        weight: 1.5,        // 細い枠線
        fill: false         // 塗りつぶしなし
      },
      onEachFeature: (feature, layer) => {
        // ポップアップは必要なら表示（Trees の邪魔にならない）
        if (feature.properties) {
          const html = Object.entries(feature.properties)
            .map(([k, v]) => `<b>${k}</b>: ${v}`)
            .join("<br>");
          layer.bindPopup(html);
        }
      }
    }).eachLayer(layer => layerTLS.addLayer(layer));
  });

/* ===== SCANエリア（CSVポイント）===== */
const layerSCAN = L.layerGroup().addTo(map);

function loadSCAN() {
  layerSCAN.clearLayers();

  fetch("data/scan.csv")
    .then(res => res.text())
    .then(text => {
      const lines = text.trim().split("\n");
      const header = lines[0].split(",");

      lines.slice(1).forEach(line => {
        const cols = line.split(",");
        const row = {};
        header.forEach((key, i) => row[key] = cols[i]);

        const lon = parseFloat(row["経度"]);
        const lat = parseFloat(row["緯度"]);
        if (isNaN(lat) || isNaN(lon)) return;

        // circleMarker（赤・半径4px）
        const marker = L.circleMarker([lat, lon], {
          radius: 4,
          color: "#ff0000",
          fillColor: "#ff0000",
          fillOpacity: 0.8,
          weight: 1
        });

        // ラベル（ScanNoのみ・接頭辞なし）
        marker.bindTooltip(row["ScanNo"], {
          permanent: true,
          direction: "top",
          className: "scan-label"
        });

        marker.addTo(layerSCAN);
      });
    });
}

loadSCAN();

/* ===== SCAN ラベルの表示制御（ズーム20以上で表示）===== */
map.on("zoomend", () => {
  const z = map.getZoom();
  const show = z >= 20;

  layerSCAN.eachLayer(marker => {
    const tt = marker.getTooltip();
    if (!tt) return;
    if (show) tt._container.style.display = "block";
    else tt._container.style.display = "none";
  });
});

/* ===== 周辺施設（GeoJSON） ===== */
const layerShuuhen = L.layerGroup().addTo(map);
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

  // ② address（小さめのサブ情報）
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

  // ④ url（Google マップで開くリンク）
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

/* ===== CSV 読み込み（樹種色分け・間伐塗りつぶし切替） ===== */
const layerCSV = L.layerGroup().addTo(map);
function loadCSV() {
  layerCSV.clearLayers();

  fetch("data/trees.csv")
    .then(res => res.text())
    .then(text => {
      const lines = text.trim().split("\n");
      const header = lines[0].split(",");

      lines.slice(1).forEach(line => {
        const cols = line.split(",");
        const row = {};
        header.forEach((key, i) => row[key] = cols[i]);

        const lon = parseFloat(row["経度"]);
        const lat = parseFloat(row["緯度"]);
        if (!lat || !lon) return;

        // ★ 幹周 → 直径（cm）
const girth = parseFloat(row["幹周"]); // 幹周(cm)
const diameter = girth / Math.PI;      // 直径(cm)

// ★ マーカー半径(px)に変換（倍率は調整可能）
const scale = map.getZoom() / 18;  // ズーム18を基準
const markerRadius = diameter * 0.2;   // 例：0.2px/cm
        
        // 樹種による色分け
        let color;
        switch (row["樹種"]) {
          case "スギ":
            color = "#99cc00"; // 黄緑
            break;
          case "アテ":
            color = "#66ccff"; // 水色
            break;
          default:
            color = "#cccccc"; // その他
        }

        // 間伐（0/1）で塗りつぶし切替
        const fillOpacity = row["間伐"] === "1" ? 0 : 0.6;

        L.circleMarker([lat, lon], {
          radius: markerRadius,
          color: color,
          fillColor: color,
          fillOpacity: fillOpacity,
          weight: 0.5
        })
.bindPopup(() => {
  let html = "";

  // 立木ID
  if (row["立木ID"]) {
    html += `<div><strong>立木ID：</strong>${row["立木ID"]}</div>`;
  }

  // 樹種
  if (row["樹種"]) {
    html += `<div><strong>樹種：</strong>${row["樹種"]}</div>`;
  }

  // DBH（胸高直?）→ 小数点1桁 + cm
  if (row["胸高直?"]) {
    const dbh = Number(row["胸高直?"]);
    if (!isNaN(dbh)) {
      html += `<div><strong>DBH：</strong>${dbh.toFixed(1)} cm</div>`;
    }
  }

  // 樹高 → 小数点1桁 + m
  if (row["樹高"]) {
    const h = Number(row["樹高"]);
    if (!isNaN(h)) {
      html += `<div><strong>樹高：</strong>${h.toFixed(1)} m</div>`;
    }
  }

  // 材積 → 小数点2桁 + m³
  if (row["材積"]) {
    const v = Number(row["材積"]);
    if (!isNaN(v)) {
      html += `<div><strong>材積：</strong>${v.toFixed(2)} m³</div>`;
    }
  }

  return html;
})        .addTo(layerCSV);
      });
    });
}

loadCSV();

/* ===== レイヤコントロール（独立配置） ===== */
L.control.layers(
  null,
  {
    "TLSエリア": layerTLS,
    "スキャン地点": layerSCAN,
    "森林調査": layerCSV,
    "20mメッシュ": layerMesh20,
    "周辺施設": layerShuuhen
  },
  { position: "bottomleft" }
).addTo(map);

map.on("zoomend", () => {
  const z = map.getZoom();

  if (z >= 20) map.addLayer(layerMesh20);
  else map.removeLayer(layerMesh20);

  if (z >= 14) map.addLayer(layerCSV);
  else map.removeLayer(layerCSV);
});
