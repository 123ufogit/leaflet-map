/*
  map.js version 0.9.2

  Contains:
    - タブ切り替え
    - サイドバー開閉
    - 地図初期化（HTML側で初期レイヤー制御）
    - ベースレイヤー
    - オーバーレイ（CS立体図 50%）
    - MiniMap
    - 属性ビューア
    - 十字線マーカー
    - 座標表示
    - 現在地取得
*/

/* ===== サイドバー開閉 ===== */
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

/* ===== ベースレイヤー定義 ===== */
const layerGSIstd = L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png",
  {
    attribution: "地理院タイル（標準）",
    maxZoom: 30,
    maxNativeZoom: 18
  }
);

const layerOSM = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 30,
    maxNativeZoom: 18
  }
);

const layerGSIort = L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg",
  {
    attribution: "地理院タイル（空中写真）",
    maxZoom: 30,
    maxNativeZoom: 18
  }
);

/* ===== CS立体図（透過50%）オーバーレイ ===== */
const layerCSmap50 = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/csmap_2024/{z}/{x}/{y}.webp",
  {
    attribution: "林野庁 CS立体図（2024）",
    maxZoom: 30,
    maxNativeZoom: 18,
    opacity: 0.5
  }
);

/* ===== 初期表示レイヤーを HTML 側の設定で切り替える ===== */

// ベースレイヤー選択
let baseLayer = layerGSIstd;  // デフォルト

if (window.defaultBaseLayer === "osm") baseLayer = layerOSM;
if (window.defaultBaseLayer === "ort") baseLayer = layerGSIort;

// 初期レイヤー配列（ベースレイヤーは必ず1つ）
let initialLayers = [baseLayer];

// オーバーレイ（複数対応可能）
if (window.defaultOverlayCS === true) initialLayers.push(layerCSmap50);

/* ===== 地図初期化（★初期位置を石川県庁、ズーム9に変更） ===== */
const map = L.map("map", {
  center: [36.594553, 136.625639],   // ★ 石川県庁
  zoom: 9,                            // ★ 石川県全体が入る
  maxZoom: 30,
  layers: initialLayers
});

/* ===== レイヤーコントロール ===== */
L.control.layers(
  {
    "地理院地図（標準）": layerGSIstd,
    "OpenStreetMap": layerOSM,
    "地理院空中写真": layerGSIort
  },
  {
    "CS立体図（透過50%）": layerCSmap50
  }
).addTo(map);

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

/* ===== 属性ビューア（ダミー） ===== */
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
  map.locate({ setView: true, maxZoom: 15 });
};

map.on("locationerror", () => {
  alert("現在地を取得できませんでした");
});

/* ===== QRコード生成 ===== */
function generateQR(text, size = 128) {
  const canvas = document.createElement("canvas");
  const qr = new QRious({
    element: canvas,
    value: text,
    size: size
  });
  return canvas;
}

document.getElementById("qrBtn").onclick = () => {
  const popup = document.getElementById("qrPopup");
  popup.style.display = popup.style.display === "block" ? "none" : "block";

  const qrBox = document.getElementById("qrCode");
  qrBox.innerHTML = "";
  qrBox.appendChild(generateQR("https://123ufogit.github.io/leaflet-map/"));
};
