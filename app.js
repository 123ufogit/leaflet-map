/*
  app.js version 0.9.0
  Updated: 2026-01-12

  Base Features:
    - Full restoration of Leaflet 0.9.0
    - EXIF-based photo management
    - 360° detection + Pannellum viewer
    - GeoJSON attribute viewer
    - Layer control + MiniMap
    - Search + geolocation
    - Center crosshair + coordinate display

  Mobile Optimization Level: 1
    - Sidebar toggle button
    - Sidebar slide-in animation
    - Larger tab buttons
    - coordBox repositioning
    - MiniMap hidden on mobile
*/

/* ===== 起動メッセージ ===== */
window.onload = () => {
  alert(
    "Leaflet 0.9.0 を読み込みました。\n\n" +
    "【このアプリでできること】\n" +
    "・地図の移動・拡大縮小\n" +
    "・地名や座標で検索\n" +
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

/* ===== 検索 ===== */
function isLatLng(text) {
  const parts = text.split(",");
  return parts.length === 2 &&
    !isNaN(parseFloat(parts[0])) &&
    !isNaN(parseFloat(parts[1]));
}

function moveToLatLng(lat, lng) {
  map.setView([lat, lng], 15);
}

function searchPlace(query) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=json&q=" +
    encodeURIComponent(query);

  fetch(url)
    .then(r => r.json())
    .then(data => {
      if (data.length === 0) {
        alert("場所が見つかりませんでした");
        return;
      }
      moveToLatLng(parseFloat(data[0].lat), parseFloat(data[0].lon));
    });
}

document.getElementById("searchBtn").onclick = () => {
  const text = document.getElementById("searchBox").value.trim();
  if (text === "") return;

  if (isLatLng(text)) {
    const p = text.split(",");
    moveToLatLng(parseFloat(p[0]), parseFloat(p[1]));
  } else {
    searchPlace(text);
  }
};

/* ===== 現在地 ===== */
document.getElementById("locateBtn").onclick = () => {
  map.locate({ setView: true, maxZoom: 16 });
};

map.on("locationerror", () => {
  alert("現在地を取得できませんでした（HTTPS が必要です）");
});

/* ===== 写真管理 ===== */
const photoDataList = [];

function detect360(imgURL, callback) {
  const img = new Image();
  img.onload = () => {
    const ratio = img.width / img.height;
    callback(Math.abs(ratio - 2.0) < 0.05);
  };
  img.src = imgURL;
}

document.getElementById("photoInput").onchange = function(e) {
  const files = e.target.files;

  for (let file of files) {
    EXIF.getData(file, function() {
      const lat = EXIF.getTag(this, "GPSLatitude");
      const lng = EXIF.getTag(this, "GPSLongitude");
      const dateTime = EXIF.getTag(this, "DateTimeOriginal");

      if (!lat || !lng) {
        alert(file.name + " にはGPS位置情報がありません。");
        return;
      }

      function toDecimal(dms) {
        return dms[0] + dms[1] / 60 + dms[2] / 3600;
      }

      const latDec = toDecimal(lat);
      const lngDec = toDecimal(lng);

      const imgURL = URL.createObjectURL(file);
      const fileName = file.name;
      const shotTime = dateTime ? dateTime : "不明";

      const index = photoDataList.length;

      detect360(imgURL, (is360) => {

        let popupHTML = "";

        if (is360) {
          popupHTML = `
            <div class="pano-box" id="pano_${index}"></div>
            <div style="font-size:12px; margin-top:4px;">
              <b>${fileName}</b><br>
              Lat: ${latDec.toFixed(6)}<br>
              Lng: ${lngDec.toFixed(6)}
            </div>
          `;
        } else {
          popupHTML = `
            <div style="text-align:center;">
              <img src="${imgURL}" width="200"><br>
              <b>${fileName}</b><br>
              Lat: ${latDec.toFixed(6)}<br>
              Lng: ${lngDec.toFixed(6)}
            </div>
          `;
        }

        const marker = L.marker([latDec, lngDec]).addTo(map);
        marker.bindPopup(popupHTML);

        marker.on("popupopen", () => {
          if (is360) {
            setTimeout(() => {
              pannellum.viewer(`pano_${index}`, {
                type: "equirectangular",
                panorama: imgURL,
                autoLoad: true,
                showFullscreenCtrl: true
              });
            }, 50);
          }
        });

        const data = {
          lat: latDec,
          lng: lngDec,
          fileName,
          imgURL,
          marker,
          shotTime,
          is360
        };

        photoDataList.push(data);
        addThumbnail(index);
      });
    });
  }
};

function addThumbnail(index) {
  const data = photoDataList[index];
  const list = document.getElementById("photoList");

  const item = document.createElement("div");
  item.className = "card";

  const img = document.createElement("img");
  img.src = data.imgURL;
  img.className = "thumb";

  const name = document.createElement("div");
  name.textContent = data.fileName;
  name.style.fontSize = "12px";
  name.style.wordBreak = "break-all";

  const time = document.createElement("div");
  time.textContent = "撮影日時: " + data.shotTime;
  time.style.fontSize = "11px";

  const latlng = document.createElement("div");
  latlng.textContent = `Lat: ${data.lat.toFixed(6)} / Lng: ${data.lng.toFixed(6)}`;
  latlng.style.fontSize = "11px";

  if (data.is360) {
    const tag360 = document.createElement("div");
    tag360.textContent = "360°";
    tag360.style.position = "absolute";
    tag360.style.top = "4px";
    tag360.style.left = "6px";
    tag360.style.background = "#007bff";
    tag360.style.color = "#fff";
    tag360.style.fontSize =