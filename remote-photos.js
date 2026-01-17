// GitHub 設定
const GITHUB_USER = "123ufogit";
const GITHUB_REPO = "leaflet-map";
const PHOTO_DIR = "photos";
const API_URL = `https://api.github.com/${GITHUB_USER}/${GITHUB_REPO}/${PHOTO_DIR}`;

const remotePhotoList = [];

// マーカー
const iconRemote = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-lightgreen.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41]
});

const icon360 = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41]
});

// EXIF → 座標
const toDecimal = d => d[0] + d[1] / 60 + d[2] / 3600;

// 360°判定
function detect360(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(Math.abs(img.width / img.height - 2.0) < 0.05);
    img.src = url;
  });
}

// サイドメニュー追加
function addCard(d) {
  const list = document.getElementById("photoList");
  const item = document.createElement("div");
  item.className = "card";

  item.innerHTML = `
    ${d.is360 ? `<div style="position:absolute;top:4px;left:6px;background:#007bff;color:#fff;font-size:10px;padding:2px 4px;border-radius:3px;">360°</div>` : ""}
    <img src="${d.url}" class="thumb">
    <div style="font-size:12px;">${d.fileName}</div>
    <div style="font-size:11px;">撮影日時: ${d.dateTime}</div>
    <div style="font-size:11px;">Lat: ${d.lat.toFixed(6)} / Lng: ${d.lng.toFixed(6)}</div>
  `;

  item.onclick = () => {
    map.setView([d.lat, d.lng], 16);
    d.marker.openPopup();
  };

  list.appendChild(item);
}

// 画像読み込み
function loadRemotePhoto(url, fileName) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;

  img.onload = async () => {
    EXIF.getData(img, async function () {
      const lat = EXIF.getTag(this, "GPSLatitude");
      const lng = EXIF.getTag(this, "GPSLongitude");
      const dateTime = EXIF.getTag(this, "DateTimeOriginal") || "不明";
      if (!lat || !lng) return;

      const latDec = toDecimal(lat);
      const lngDec = toDecimal(lng);
      const is360 = await detect360(url);

      const marker = L.marker([latDec, lngDec], {
        icon: is360 ? icon360 : iconRemote
      }).addTo(map);

      const panoId = `pano_${fileName.replace(/\W/g, "_")}`;

      const popupHTML = is360
        ? `<div class="pano-box" id="${panoId}"></div>
           <div style="font-size:12px;margin-top:4px;">
             <b>${fileName}</b><br>${dateTime}<br>
             Lat:${latDec.toFixed(6)} Lng:${lngDec.toFixed(6)}
           </div>`
        : `<div style="text-align:center;">
             <img src="${url}" width="200"><br>
             <b>${fileName}</b><br>${dateTime}<br>
             Lat:${latDec.toFixed(6)} Lng:${lngDec.toFixed(6)}
           </div>`;

      marker.bindPopup(popupHTML);

      marker.on("popupopen", () => {
        if (is360) {
          setTimeout(() => {
            pannellum.viewer(panoId, {
              type: "equirectangular",
              panorama: url,
              autoLoad: true,
              showFullscreenCtrl: true
            });
          }, 200);
        }
      });

      remotePhotoList.push({ fileName, url, lat: latDec, lng: lngDec, dateTime, is360, marker });
    });
  };
}

// GitHub API 読み込み
fetch(API_URL)
  .then(r => r.json())
  .then(files => {
    files
      .filter(f => f.name.toLowerCase().match(/\.(jpg|jpeg)$/))
      .forEach(f => {
        const rawURL = `https://${GITHUB_USER}.github.io/${GITHUB_REPO}/${PHOTO_DIR}/${f.name}`;
        loadRemotePhoto(rawURL, f.name);
      });

    setTimeout(() => {
      remotePhotoList
        .sort((a, b) => a.dateTime.localeCompare(b.dateTime))
        .forEach(addCard);
    }, 1500);
  });