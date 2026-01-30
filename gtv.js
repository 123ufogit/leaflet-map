/* ===== 起動メッセージ（GeoTIFF Viewer 0.9.3 用） ===== */
window.onload = () => {
  alert(
    "GeoTIFF Viewer へようこそ！\n\n" +
    "このビューアは、GeoTIFF（ラスタデータ）、GeoJSON をブラウザ上で直感的に重ね合わせて確認できる、シンプルな地図ツールです。\n\n" +
    "ファイルは、画面上部のドロップエリアにドラッグ＆ドロップするか、「ファイルを選択」ボタンから読み込めます。\n\n" +
    "地図上での作図・編集、保存、印刷、さらにポリゴン面積・ライン延長の計測も行えます。\n\n" +
    "本ツールはブラウザ上で動作し、データは保存されません。読み込んだファイルはすべて利用者の端末内で処理されます。\n\n" +
    "利用者は、利用規約に同意した上で本アプリを利用するものとします。"
  );
};

/* ===============================
   1. Leaflet マップ初期化
================================ */
const map = L.map("map", {
  center: [36.56, 136.65],
  zoom: 13
});

  // 方位記号コントロール
const NorthControl = L.Control.extend({
  options: { position: "topright" },
  onAdd: function (map) {
    const div = L.DomUtil.create("div", "leaflet-control-north");
    return div;
  }
});

map.addControl(new NorthControl());

  
/* ===============================
   2. pane 設定（描画順）
================================ */
map.createPane("geotiffPane");
map.getPane("geotiffPane").style.zIndex = 450;

map.createPane("vectorPane");
map.getPane("vectorPane").style.zIndex = 500;

/* ===============================
   3. ベースレイヤー
================================ */
const gsiStd = L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
  { maxZoom: 18, attribution: "地理院タイル" }
).addTo(map);

const gsiOrt = L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg",
  { maxZoom: 18, attribution: "地理院タイル（オルソ画像）" }
);

/* ===============================
   4. MiniMap
================================ */
const miniLayer = L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"
);

new L.Control.MiniMap(miniLayer, {
  position: "bottomright",
  toggleDisplay: true,
  minimized: false,
  width: 150,
  height: 150,
  zoomLevelOffset: -5
}).addTo(map);

/* ===============================
   5. 十字線マーカー & 座標表示
================================ */
const crosshairIcon = L.divIcon({
  className: "crosshair-icon",
  html: "+",
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const centerMarker = L.marker(map.getCenter(), {
  icon: crosshairIcon,
  interactive: false
}).addTo(map);

function updateCenterInfo() {
  const c = map.getCenter();
  centerMarker.setLatLng(c);
  document.getElementById("coordBox").textContent =
    `Lat: ${c.lat.toFixed(6)} , Lng: ${c.lng.toFixed(6)}`;
}

map.on("move", updateCenterInfo);
updateCenterInfo();

/* ===============================
   6. 作図レイヤ（vectorPane）
================================ */
const drawnItems = new L.FeatureGroup(null, { pane: "vectorPane" });
drawnItems.options.pane = "vectorPane";
map.addLayer(drawnItems);

L.control.layers(
  { "標準地図": gsiStd, "航空写真": gsiOrt },
  { "作図レイヤ": drawnItems }
).addTo(map);

/* ===============================
   7. Leaflet.draw
================================ */
const drawControl = new L.Control.Draw({
  edit: { featureGroup: drawnItems, remove: true },
  draw: {
    polygon: { allowIntersection: false, showArea: true },
    polyline: true,
    rectangle: true,
    marker: true,
    circle: false,
    circlemarker: false
  }
});
map.addControl(drawControl);

/* ===== 計測＋ポップアップ付与 ===== */
function bindMeasurementPopup(layer) {
  let html = "";

  // ポリゴン（面積）
  if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) {
    const latlngs = layer.getLatLngs()[0];
    const area = L.GeometryUtil.geodesicArea(latlngs); // m²
    const areaHa = area / 10000;
    html =
      `面積: ${area.toFixed(0)} m²<br>` +
      `　　 ${areaHa.toFixed(4)} ha`;

  // ライン（延長）
  } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
    const latlngs = layer.getLatLngs();
    let length = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
      length += map.distance(latlngs[i], latlngs[i + 1]); // m
    }
    const lengthKm = length / 1000;
    html =
      `延長: ${length.toFixed(1)} m<br>` +
      `　　 ${lengthKm.toFixed(3)} km`;

  // マーカー
  } else if (layer instanceof L.Marker) {
    const c = layer.getLatLng();
    html =
      `座標<br>` +
      `Lat: ${c.lat.toFixed(6)}<br>` +
      `Lng: ${c.lng.toFixed(6)}`;
  }

  if (!html) return;

  layer.bindPopup(html);
  layer.on("click", () => {
    layer.openPopup();
  });
}

map.on(L.Draw.Event.CREATED, (e) => {
  const layer = e.layer;
  layer.options.pane = "vectorPane";
  drawnItems.addLayer(layer);
  bindMeasurementPopup(layer);
});

/* ===============================
   8. easyPrint（サイドバーも含めて印刷）
================================ */
L.easyPrint({
  title: "印刷 / 保存",
  position: "topleft",
  sizeModes: ["Current", "A4Portrait", "A4Landscape"],
  elementsToHide: ""   // ページ全体を印刷対象に
}).addTo(map);

/* ===============================
   9. GeoTIFF 読み込み
================================ */
let currentLayer = null;

async function loadGeoTIFF(arrayBuffer) {
  const georaster = await parseGeoraster(arrayBuffer, {
    buildPyramid: false
  });

  if (currentLayer) map.removeLayer(currentLayer);

  currentLayer = new GeoRasterLayer({
    georaster,
    opacity: 0.8,
    resolution: 128,
    updateWhenZooming: true,
    updateInterval: 0,
    keepBuffer: 5,
    pane: "geotiffPane"
  });

  currentLayer.addTo(map);
  map.fitBounds(currentLayer.getBounds());
}

/* ===============================
   10. ファイル種別を自動判定
================================ */
async function handleFile(file) {
  const name = file.name.toLowerCase();

  // GeoTIFF
  if (name.endsWith(".tif") || name.endsWith(".tiff")) {
    const arrayBuffer = await file.arrayBuffer();
    await loadGeoTIFF(arrayBuffer);
    return;
  }

  // GeoJSON
  if (name.endsWith(".geojson") || name.endsWith(".json")) {
    const text = await file.text();
    const geojson = JSON.parse(text);

    const layer = L.geoJSON(geojson, {
      pane: "vectorPane",
      onEachFeature: (feature, lyr) => {
        drawnItems.addLayer(lyr);
        bindMeasurementPopup(lyr);
      }
    });

    map.fitBounds(layer.getBounds());
    return;
  }

  // KML
  if (name.endsWith(".kml")) {
    const text = await file.text();
    const parser = new DOMParser();
    const kmlDom = parser.parseFromString(text, "text/xml");
    const geojson = toGeoJSON.kml(kmlDom);

    const layer = L.geoJSON(geojson, {
      pane: "vectorPane",
      onEachFeature: (feature, lyr) => {
        drawnItems.addLayer(lyr);
        bindMeasurementPopup(lyr);
      }
    });

    map.fitBounds(layer.getBounds());
    return;
  }
}

/* ===============================
   11. ファイル選択（ボタン）
================================ */
document.getElementById("fileInput").addEventListener("change", async (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    await handleFile(file);
  }

  event.target.value = "";
});

/* ===============================
   12. ドラッグ＆ドロップ（ドロップエリア）
================================ */
const dropzone = document.getElementById("dropzone");

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    await handleFile(file);
  }
});

  // スケールバー（中央下）
L.control.scale({
  position: "bottomleft",
  imperial: false
}).addTo(map);

  
/* ===============================
   13. GeoJSON / KML 保存
================================ */
function downloadGeoJSON() {
  const geojson = drawnItems.toGeoJSON();
  const blob = new Blob([JSON.stringify(geojson)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "drawings.geojson";
  a.click();

  URL.revokeObjectURL(url);
}

function downloadKML() {
  const geojson = drawnItems.toGeoJSON();
  const kml = tokml(geojson);

  const blob = new Blob([kml], { type: "application/vnd.google-earth.kml+xml" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "drawings.kml";
  a.click();

  URL.revokeObjectURL(url);
}

document.getElementById("btnSaveGeoJSON").addEventListener("click", downloadGeoJSON);
document.getElementById("btnSaveKML").addEventListener("click", downloadKML);
