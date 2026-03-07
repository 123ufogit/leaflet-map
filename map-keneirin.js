
/* ===== レイヤ宣言 ===== */
const layerMesh20 = L.layerGroup().addTo(map);
const layerTLS    = L.layerGroup().addTo(map);

/* ===== TLSエリア（判定用 + 表示用 + ラベル） ===== */
let areaIndexLayer = null;

fetch("data/TLS_area.geojson")
  .then(res => res.json())
  .then(json => {

    // 判定用（透明）
    areaIndexLayer = L.geoJSON(json, {
      style: { color: "#000", weight: 1, fillOpacity: 0 }
    });

    // 表示用（青枠 + エリア名ラベル）
    L.geoJSON(json, {
      style: {
        color: "#0066ff",
        weight: 1.5,
        fill: false
      },
      onEachFeature: (feature, layer) => {

        /* ★★★ エリア名ラベル（背景なし・文字だけ） ★★★ */
        const center = layer.getBounds().getCenter();
        const areaName = feature.properties["エリア"];

        const label = L.marker(center, {
          icon: L.divIcon({
            className: "area-label",
            html: `<span style="
              color:#0066ff;
              font-size:16px;
              font-weight:bold;
            ">${areaName}</span>`
          }),
          interactive: false
        });

        label.addTo(layerTLS);

        /* ポップアップ（既存） */
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
