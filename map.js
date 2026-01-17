/*
  map.js version 0.9.0

  Contains:
    - 起動メッセージ
    - タブ切り替え
    - サイドバー開閉（スマホ）
    - 地図初期化
    - ベースレイヤー
    - MiniMap
    - 属性ビューア
    - 十字線マーカー
    - 座標表示
    - 検索
    - 現在地取得
*/

/* ===== 起動メッセージ ===== */
window.onload = () => {
  alert(
    "Leaflet 0.9.0 を読み込みました。\n\n" +
    "【このアプリでできること】\n" +
    "・地図の移動・拡大縮小\n" +
    "・現在地の取得\n" +
    "・属性情報の確認\n" +
    "・写真管理（EXIF 読み込み）\n" +
    "・360°写真の自動判別とビューア表示\n" +
    "・写真カード一覧から地図へジャンプ\n"
  );
};

/* ===== スマホ用サイドバー開閉 ===== */
document.getElementById("menuBtn").onclick = () => {
  document.getElementById("sidebar").classList.toggle("open");
};

/* ===== タブ切り替え ===== */
const tabAttr = document.getElementById("tabAttr");
const tabPhoto = document.getElementById("tabPhoto");
const attrPanel = document.getElementById("attrPanel");
const photoPanel = document.getElementById("photoPanel");

tabAttr.onclick = () => {
  tabAttr.classList.add("active");
  tabPhoto.classList.remove("active");
  attrPanel.classList.add("active");
  photoPanel.classList.remove("active");
};

tabPhoto.onclick = () => {
  tabPhoto.classList.add("active");
  tabAttr.classList.remove("active");
  photoPanel.classList.add("active");
  attrPanel.classList.remove("active");
};

/* ===== 地図初期化 ===== */
const layerGSIstd = L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
  { attribution: "地理院タイル（標準）" }
);

const map = L.map("map", {
  center: [37.303254, 136.915478],
  zoom: 14,
  layers: [layerGSIstd]
});

/* ===== ベースレイヤー ===== */
const layerOSM = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { attribution: "© OpenStreetMap contributors" }
);

const layerGSIort = L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg",
  { attribution: "地理院タイル（空中写真）" }
);

L.control.layers({
  "地理院地図（標準）": layerGSIstd,
  "OpenStreetMap": layerOSM,
  "地理院空中写真": layerGSIort
}).addTo(map);

/* ===== MiniMap ===== */
const miniLayer = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
);

new L.Control.MiniMap(miniLayer, {
  position: "bottomright",
  toggleDisplay: true,
  minimized: false,
  width: 150,
  height: 150,
  zoomLevelOffset: -5
}).addTo(map);

/* ===== 属性ビューア ===== */
const dummyGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "サンプル地点",
        desc: "ここに説明文が入ります。",
        area: "不明"
      },
      geometry: {
        type: "Point",
        coordinates: [136.915478, 37.303254]
      }
    }
  ]
};

L.geoJSON(dummyGeoJSON, {
  onEachFeature: (feature, layer) => {
    layer.on("click", () => {
      let html = "<table class='attr-table'>";
      for (let key in feature.properties) {
        html += `<tr><td><b>${key}</b></td><td>${feature.properties[key]}</td></tr>`;
      }
      html += "</table>";
      document.getElementById("attrContent").innerHTML = html;
    });
  }
}).addTo(map);

/* ===== 十字線マーカー ===== */
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

/* ===== 現在地 ===== */
document.getElementById("locateBtn").onclick = () => {
  map.locate({ setView: true, maxZoom: 16 });
};

map.on("locationerror", () => {
  alert("現在地を取得できませんでした");
});
