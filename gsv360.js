/* ===== 起動メッセージ ===== */
window.onload = () => {
  alert(
    "Geo Snap Viewer 360 へようこそ！\n\n" +
    "Geo Snap Viewer 360 (GSV360) は、位置情報付き写真を地図上に直感的に可視化できる、シンプルでパワフルな地図ビューワーです。\n" +
    "写真をドラッグ＆ドロップするだけで、撮影地点にマーカーが自動配置され、通常写真はもちろん、360°パノラマ写真もその場で閲覧できます。\n" +
    "EXIF の GPS 情報を読み取り、地図上にスナップを並べていく感覚で、旅の記録、フィールド調査、森林・環境モニタリングなど、幅広い用途に活用できます。" +
    "GSV360にはデータ保存機能はありません。写真データの取り扱い・管理は、利用者自身の責任で行ってください。\n" +
    "本アプリの利用により発生したいかなる損害・トラブルについても、開発者は一切の責任を負いません。利用者は、利用規約に同意した上で本アプリを利用するものとします。"  
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
  { attribution: "地理院タイル（標準）" ,
  maxZoom: 30,
  maxNativeZoom: 18
}
  );

const map = L.map("map", {
  center: [37.303254, 136.915478],
  zoom: 15,
  maxZoom: 30,
  layers: [layerGSIstd]
});

/* ===== ベースレイヤー ===== */
const layerOSM = L.tileLayer(
  "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  { attribution: "© OpenStreetMap contributors" ,
    maxZoom: 30,
    maxNativeZoom: 18
}
);

const layerGSIort = L.tileLayer(
  "https://cyberjapandata.gsi.go.jp/xyz/ort/{z}/{x}/{y}.jpg",
  { attribution: "地理院タイル（空中写真）",
  maxZoom: 30,
  maxNativeZoom: 18
}
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
