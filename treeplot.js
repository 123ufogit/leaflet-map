/*
  treeplot.js version 0.9.4 + treeData 拡張
  - URL パラメータから座標を受け取り map.setView() を実行
  - レイヤ独立構造を維持
  - CSV パース共通化
  - TREES の circleMarker に最小半径 4px を適用
  - ★ marker.treeData を treestat.js 用に付与
*/

/* ===== URLパラメータから座標を受け取り、地図を移動 ===== */
(function () {
  const params = new URLSearchParams(location.search);
  const lat = parseFloat(params.get("lat"));
  const lng = parseFloat(params.get("lng"));

  if (!isNaN(lat) && !isNaN(lng)) {
    map.setView([lat, lng], 18);
  }
})();

/* ===== 共通：CSV パーサ ===== */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");
  return lines.slice(1).map(line => {
    const cols = line.split(",");
    const row = {};
    header.forEach((k, i) => row[k] = cols[i]);
    return row;
  });
}

/* ===== レイヤ宣言 ===== */
const layerMesh20 = L.layerGroup().addTo(map);
const layerTLS    = L.layerGroup().addTo(map);
const layerSCAN   = L.layerGroup().addTo(map);
const layerCSV    = L.layerGroup().addTo(map);

/* ===== TLSエリア ===== */
let areaIndexLayer = null;

fetch("data/TLS_area.geojson")
  .then(res => res.json())
  .then(json => {

    // 判定用（透明）
    areaIndexLayer = L.geoJSON(json, {
      style: { color: "#000", weight: 1, fillOpacity: 0 }
    });

    // 表示用（青枠）
    L.geoJSON(json, {
      style: {
        color: "#0066ff",
        weight: 1.5,
        fill: false
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties) {
          const html = Object.entries(feature.properties)
            .map(([k, v]) => `<b>${k}</b>: ${v}`)
            .join("<br>");
          layer.bindPopup(html);
        }
      }
    }).eachLayer(layer => layerTLS.addLayer(layer));
  });

/* ===== メッシュ20 ===== */
fetch("data/mesh20.geojson")
  .then(res => res.json())
  .then(json => {
    L.geoJSON(json, {
      style: {
        color: "#0066ff",
        weight: 0.3,
        fill: false
      }
    }).eachLayer(layer => layerMesh20.addLayer(layer));
  });

/* ===== SCAN（初期読み込み） ===== */
function loadSCAN(path = "data/scan.csv") {
  layerSCAN.clearLayers();

  fetch(path)
    .then(res => res.text())
    .then(text => {
      const rows = parseCSV(text);

      rows.forEach(row => {
        const lon = parseFloat(row["経度"]);
        const lat = parseFloat(row["緯度"]);
        if (isNaN(lat) || isNaN(lon)) return;

        const marker = L.circleMarker([lat, lon], {
          radius: 4,
          color: "#ff0000",
          fillColor: "#ff0000",
          fillOpacity: 0.8,
          weight: 1
        });

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

/* ===== TREES（初期読み込み） ===== */
function loadCSV(path = "data/trees.csv") {
  layerCSV.clearLayers();

  fetch(path)
    .then(res => res.text())
    .then(text => {
      const rows = parseCSV(text);

      rows.forEach(row => {
        const lon = parseFloat(row["経度"]);
        const lat = parseFloat(row["緯度"]);
        if (isNaN(lat) || isNaN(lon)) return;

        const girth = parseFloat(row["幹周"]);
        const diameter = girth / Math.PI;

        const markerRadius = Math.max(diameter * 0.2, 4);

        let color = "#cccccc";
        if (row["樹種"] === "スギ") color = "#99cc00";
        if (row["樹種"] === "アテ") color = "#66ccff";

        const fillOpacity = row["間伐"] === "1" ? 0 : 0.6;

        /* ===== メインのマーカー ===== */
        const marker = L.circleMarker([lat, lon], {
          radius: markerRadius,
          color,
          fillColor: color,
          fillOpacity,
          weight: 0.5
        });

        /* ★★★ treestat.js 用：統計計算データを marker に付与 ★★★ */
        marker.treeData = {
          DBH: Number(row["胸高直?"]),
          Height: Number(row["樹高"]),
          Volume: Number(row["材積"]),
          Species: row["樹種"],
          Cut: Number(row["間伐"]),
          lon,
          lat
        };

        /* ===== 100年木の白枠 ===== */
        if (row["コメン?"] === "100年木") {
          const blackoutline = L.circleMarker([lat, lon], {
            radius: markerRadius + 1,
            color: "#000000",
            weight: 3,
            fillOpacity: 0
          });
          blackoutline.addTo(layerCSV);

          const whiteoutline = L.circleMarker([lat, lon], {
            radius: markerRadius + 1,
            color: "#ffffff",
            weight: 2,
            fillOpacity: 0
          });
          whiteoutline.addTo(layerCSV);
        }

        /* ===== ポップアップ ===== */
        marker.bindPopup(() => {
          let html = "";
          if (row["立木ID"]) html += `<div><strong>立木ID：</strong>${row["立木ID"]}</div>`;
          if (row["樹種"])   html += `<div><strong>樹種：</strong>${row["樹種"]}</div>`;

          const dbh = Number(row["胸高直?"]);
          if (!isNaN(dbh)) html += `<div><strong>DBH：</strong>${dbh.toFixed(1)} cm</div>`;

          const h = Number(row["樹高"]);
          if (!isNaN(h)) html += `<div><strong>樹高：</strong>${h.toFixed(1)} m</div>`;

          const v = Number(row["材積"]);
          if (!isNaN(v)) html += `<div><strong>材積：</strong>${v.toFixed(2)} m³</div>`;

          if (row["コメン?"]) html += `<div><strong>コメント：</strong>${row["コメン?"]}</div>`;
          return html;
        });

        marker.addTo(layerCSV);
      });
    });
}

loadCSV();

/* ===== エリア切替（SCAN + TREES） ===== */
function loadAreaData(folder) {
  console.log("Loading:", folder);

  loadSCAN(`data/${folder}/scan.csv`);
  loadCSV(`data/${folder}/trees.csv`);
}

/* ===== SCAN ラベル表示制御 ===== */
map.on("zoomend", () => {
  const show = map.getZoom() >= 20;

  layerSCAN.eachLayer(marker => {
    const tt = marker.getTooltip();
    if (!tt) return;
    tt._container.style.display = show ? "block" : "none";
  });
});

/* ===== レイヤコントロール ===== */
L.control.layers(
  null,
  {
    "TLSエリア": layerTLS,
    "スキャン地点": layerSCAN,
    "森林調査": layerCSV,
    "20mメッシュ": layerMesh20
  },
  { position: "bottomleft" }
).addTo(map);
