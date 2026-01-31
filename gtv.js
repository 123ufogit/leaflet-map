/* ----------------------------------------
   起動メッセージ
---------------------------------------- */
window.onload = () => {
  alert(
    "GeoTIFF Viewer へようこそ！\n\n" +
    "GeoTIFF / GeoJSON / KML をブラウザ上で重ね合わせて確認できます。\n" +
    "ファイルは画面上部のドロップエリアにドラッグ＆ドロップしてください。\n\n" +
    "作図・編集・保存、面積・延長の計測も可能です。\n"
  );
};

/* ----------------------------------------
   1. Leaflet マップ初期化
---------------------------------------- */
const map = L.map("map", {
  center: [36.56, 136.65],
  zoom: 13
});

/* ----------------------------------------
   方位記号コントロール
---------------------------------------- */
const NorthControl = L.Control.extend({
  options: { position: "topright" },
  onAdd: function () {
    return L.DomUtil.create("div", "leaflet-control-north");
  }
});
map.addControl(new NorthControl());

/* ----------------------------------------
   2. pane 設定
---------------------------------------- */
map.createPane("geotiffPane");
map.getPane("geotiffPane").style.zIndex = 450;

map.createPane("vectorPane");
map.getPane("vectorPane").style.zIndex = 500;

/* ----------------------------------------
   3. ベースレイヤー
---------------------------------------- */
const gsiStd = L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
  { maxZoom: 18, attribution: "地理院タイル" }
).addTo(map);

const gsiOrt = L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg",
  { maxZoom: 18, attribution: "地理院タイル（オルソ画像）" }
);

/* ----------------------------------------
   4. MiniMap（DOM 移動なし）
---------------------------------------- */
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

/* ----------------------------------------
   5. 十字線マーカー & 座標表示
---------------------------------------- */
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

/* ----------------------------------------
   6. 作図レイヤ
---------------------------------------- */
const drawnItems = new L.FeatureGroup(null, { pane: "vectorPane" });
drawnItems.options.pane = "vectorPane";
map.addLayer(drawnItems);

L.control.layers(
  { "標準地図": gsiStd, "航空写真": gsiOrt },
  { "作図レイヤ": drawnItems }
).addTo(map);

/* ----------------------------------------
   7. Leaflet.draw
---------------------------------------- */
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

/* ----------------------------------------
   8. 面積・延長計測（合計なし）
---------------------------------------- */
function bindMeasurementPopup(layer) {
  let html = "";

  /* ---- Polygon / MultiPolygon ---- */
  if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) {

    const latlngs = layer.getLatLngs();
    let polygons = Array.isArray(latlngs[0][0]) ? latlngs : [latlngs];

    html = "面積<br>";

    polygons.forEach((poly, idx) => {
      const outer = poly[0];
      let areaOuter = L.GeometryUtil.geodesicArea(outer);

      let areaHoles = 0;
      for (let i = 1; i < poly.length; i++) {
        areaHoles += L.GeometryUtil.geodesicArea(poly[i]);
      }

      const area = areaOuter - areaHoles;

      const haRaw = area / 10000;
      const ha = Math.floor(haRaw * 100) / 100;

      html += `Polygon ${idx + 1}: ${ha.toFixed(2)} ha<br>` +
              `　　　　　 ${area.toFixed(0)} m²<br>`;
    });
  }

  /* ---- Polyline / MultiLineString ---- */
  else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {

    const latlngs = layer.getLatLngs();
    let lines = Array.isArray(latlngs[0]) ? latlngs : [latlngs];

    html = "延長<br>";

    lines.forEach((line, idx) => {
      let len = 0;
      for (let i = 0; i < line.length - 1; i++) {
        len += map.distance(line[i], line[i + 1]);
      }
      const km = len / 1000;

      html += `Line ${idx + 1}: ${len.toFixed(1)} m (${km.toFixed(3)} km)<br>`;
    });
  }

  /* ---- Marker ---- */
  else if (layer instanceof L.Marker) {
    const c = layer.getLatLng();
    html =
      `座標<br>` +
      `Lat: ${c.lat.toFixed(6)}<br>` +
      `Lng: ${c.lng.toFixed(6)}`;
  }

  if (!html) return;

  layer.bindPopup(html);
  layer.on("click", () => layer.openPopup());
}

/* Draw イベント */
map.on(L.Draw.Event.CREATED, (e) => {
  const layer = e.layer;
  layer.options.pane = "vectorPane";
  drawnItems.addLayer(layer);
  bindMeasurementPopup(layer);
});

/* ----------------------------------------
   9. GeoTIFF 読み込み
---------------------------------------- */
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

/* ----------------------------------------
   10. ファイル種別判定
---------------------------------------- */
async function handleFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".tif") || name.endsWith(".tiff")) {
    const arrayBuffer = await file.arrayBuffer();
    await loadGeoTIFF(arrayBuffer);
    return;
  }

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

/* ----------------------------------------
   11. ファイル選択
---------------------------------------- */
document.getElementById("fileInput").addEventListener("change", async (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    await handleFile(file);
  }

  event.target.value = "";
});

/* ----------------------------------------
   12. ドラッグ＆ドロップ
---------------------------------------- */
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

/* ----------------------------------------
   13. スケールバー
---------------------------------------- */
L.control.scale({
  position: "bottomleft",
  imperial: false
}).addTo(map);

/* ----------------------------------------
   14. GeoJSON / KML 保存
---------------------------------------- */
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
