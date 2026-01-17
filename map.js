/*
  map.js version 0.9.1

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
    - 現在地取得
    - 周辺施設レイヤ
    - CSVレイヤ（樹種色分け・間伐塗りつぶし切替）
    - レイヤコントロール（独立）
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
    "・写真カード一覧から地図へジャンプ\n" +
    "・CSVデータの読み込みと色分け表示"
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
  zoom: 15,
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

/* ===== レイヤグループ ===== */
const layerShuuhen = L.layerGroup().addTo(map);
const layerCSV = L.layerGroup().addTo(map);

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

/* ===== 周辺施設（GeoJSON） ===== */
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
          weight: 2
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
    "TLSエリア": layerTLS
    "森林調査": layerCSV
    "周辺施設": layerShuuhen,
  },
  { position: "bottomleft" }
).addTo(map);
