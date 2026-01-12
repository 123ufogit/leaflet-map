/*
  remote-photos.js
  GitHub API で photos/ フォルダ内の JPG を自動取得し、
  EXIF GPS と撮影日時を読み取り、
  360°写真なら Pannellum で自動表示し、
  写真管理タブに一覧表示する。
  photo.js とは完全に独立して動作する。
*/

// GitHub リポジトリ情報
const GITHUB_USER = "123ufogit";
const GITHUB_REPO = "leaflet-map";
const PHOTO_DIR = "photos";

// GitHub API URL
const API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${PHOTO_DIR}`;

// リモート写真データ格納
const remotePhotoList = [];

// ===== マーカー色（自由に変更可能） =====
const iconRemote = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-lightgreen.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// 360°写真用マーカー（赤）
const icon360 = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// EXIF → 座標変換
function toDecimal(dms) {
  return dms[0] + dms[1] / 60 + dms[2] / 3600;
}

// 360°判定（横幅 ÷ 高さ ≒ 2.0）
function detect360(url, callback) {
  const img = new Image();
  img.onload = () => {
    const ratio = img.width / img.height;
    callback(Math.abs(ratio - 2.0) < 0.05);
  };
  img.src = url;
}

// サイドメニューにカード追加
function addRemoteThumbnail(data) {
  const list = document.getElementById("photoList");

  const item = document.createElement("div");
  item.className = "card";

  const img = document.createElement("img");
  img.src = data.url;
  img.className = "thumb";

  const name = document.createElement("div");
  name.textContent = data.fileName;
  name.style.fontSize = "12px";
  name.style.wordBreak = "break-all";

  const time = document.createElement("div");
  time.textContent = "撮影日時: " + data.dateTime;
  time.style.fontSize = "11px";

  const latlng = document.createElement("div");
  latlng.textContent = `Lat: ${data.lat.toFixed(6)} / Lng: ${data.lng.toFixed(6)}`;
  latlng.style.fontSize = "11px";

  // 360°タグ
  if (data.is360) {
    const tag360 = document.createElement("div");
    tag360.textContent = "360°";
    tag360.style.position = "absolute";
    tag360.style.top = "4px";
    tag360.style.left = "6px";
    tag360.style.background = "#007bff";
    tag360.style.color = "#fff";
    tag360.style.fontSize = "10px";
    tag360.style.padding = "2px 4px";
    tag360.style.borderRadius = "3px";
    item.appendChild(tag360);
  }

  // カードクリックで地図へジャンプ
  item.onclick = () => {
    map.setView([data.lat, data.lng], 16);
    data.marker.openPopup();
  };

  item.appendChild(img);
  item.appendChild(name);
  item.appendChild(time);
  item.appendChild(latlng);
  list.appendChild(item);
}

// GitHub 上の JPG を読み込んで座標を取得
function loadRemotePhoto(url, fileName) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;

  img.onload = () => {
    EXIF.getData(img, function() {
      const lat = EXIF.getTag(this, "GPSLatitude");
      const lng = EXIF.getTag(this, "GPSLongitude");
      const dateTime = EXIF.getTag(this, "DateTimeOriginal") || "不明";

      if (!lat || !lng) {
        console.log(fileName + " にGPS情報がありません");
        return;
      }

      const latDec = toDecimal(lat);
      const lngDec = toDecimal(lng);

      // 360°判定
      detect360(url, (is360) => {

        // マーカー色を種類別に変更
        const markerIcon = is360 ? icon360 : iconRemote;

        // マーカー追加
        const marker = L.marker([latDec, lngDec], { icon: markerIcon }).addTo(map);

        // Popup HTML
        let popupHTML = "";

        if (is360) {
          popupHTML = `
            <div class="pano-box" id="pano_remote_${remotePhotoList.length}"></div>
            <div style="font-size:12px; margin-top:4px;">
              <b>${fileName}</b><br>
              ${dateTime}<br>
              Lat: ${latDec.toFixed(6)}<br>
              Lng: ${lngDec.toFixed(6)}
            </div>
          `;
        } else {
          popupHTML = `
            <div style="text-align:center;">
              <img src="${url}" width="200"><br>
              <b>${fileName}</b><br>
              ${dateTime}<br>
              Lat: ${latDec.toFixed(6)}<br>
              Lng: ${lngDec.toFixed(6)}
            </div>
          `;
        }

        marker.bindPopup(popupHTML);

        // Popup 開いたら Pannellum 初期化
        marker.on("popupopen", () => {
          if (is360) {
            setTimeout(() => {
              pannellum.viewer(`pano_remote_${remotePhotoList.length}`, {
                type: "equirectangular",
                panorama: url,
                autoLoad: true,
                showFullscreenCtrl: true
              });
            }, 200);
          }
        });

        // データ保存
        const data = {
          fileName,
          url,
          lat: latDec,
          lng: lngDec,
          dateTime,
          is360,
          marker
        };

        remotePhotoList.push(data);
      });
    });
  };
}

// GitHub API から photos フォルダ内のファイル一覧を取得
fetch(API_URL)
  .then(res => res.json())
  .then(files => {
    const jpgFiles = files.filter(f =>
      f.name.toLowerCase().endsWith(".jpg") ||
      f.name.toLowerCase().endsWith(".jpeg")
    );

    // まず全画像を読み込む
    jpgFiles.forEach(file => {
      const rawURL = `https://${GITHUB_USER}.github.io/${GITHUB_REPO}/${PHOTO_DIR}/${file.name}`;
      loadRemotePhoto(rawURL, file.name);
    });

    // 少し待ってからソートして一覧表示
    setTimeout(() => {
      remotePhotoList.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
      remotePhotoList.forEach(data => addRemoteThumbnail(data));
    }, 1500);
  })
  .catch(err => console.error("GitHub API エラー:", err));