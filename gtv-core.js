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
   4. MiniMap
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
   5. 十字線マーカー & 座標 + 住所表示
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

/* ---- 住所取得（GSI Reverse Geocoder） ---- */
async function fetchAddress(lat, lng) {
  try {
    const url =
      `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lng}`;
    const res = await fetch(url);
    const json = await res.json();

    const muni = json.results.muni || "";
    const lv01 = json.results.lv01 || "";

    return `${muni}${lv01}付近`;
  } catch (e) {
    return "住所取得エラー";
  }
}

/* ---- 中心座標 + 住所表示 ---- */
async function updateCenterInfo() {
  const c = map.getCenter();
  centerMarker.setLatLng(c);

  const address = await fetchAddress(c.lat, c.lng);

  document.getElementById("coordBox").textContent =
    `Lat: ${c.lat.toFixed(6)} , Lng: ${c.lng.toFixed(6)}（${address}）`;
}

map.on("move", () => updateCenterInfo());
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
   7. Leaflet.draw（UIのみ）
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
   8. スケールバー
---------------------------------------- */
L.control.scale({
  position: "bottomleft",
  imperial: false
}).addTo(map);

/* ----------------------------------------
   9. 保存ボタン（UIのみ）
---------------------------------------- */
const SaveControl = L.Control.extend({
  options: { position: "topleft" },

  onAdd: function () {
    const div = L.DomUtil.create("div", "leaflet-bar save-control");

    div.innerHTML = `
      <a class="save-toggle" title="保存メニュー">💾</a>
      <div class="save-menu hidden">
        <a id="btnSaveGeoJSON">GeoJSON</a>
        <a id="btnSaveKML">KML</a>
      </div>
    `;

    L.DomEvent.disableClickPropagation(div);

    div.querySelector(".save-toggle").onclick = () => {
      div.querySelector(".save-menu").classList.toggle("hidden");
    };

    return div;
  }
});

map.addControl(new SaveControl());
