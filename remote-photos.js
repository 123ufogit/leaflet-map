/*
  remote-photos.js
  GitHub API を使って photos/ フォルダ内の JPG を自動取得し、
  EXIF GPS を読み取って地図にマーカー表示する。
*/

// GitHub リポジトリ情報
const GITHUB_USER = "123ufogit";
const GITHUB_REPO = "leaflet-map";
const PHOTO_DIR = "photos";

// GitHub API URL
const API_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${PHOTO_DIR}`;

// EXIF → 座標変換
function toDecimal(dms) {
  return dms[0] + dms[1] / 60 + dms[2] / 3600;
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

      if (!lat || !lng) {
        console.log(fileName + " にGPS情報がありません");
        return;
      }

      const latDec = toDecimal(lat);
      const lngDec = toDecimal(lng);

      // マーカー追加
      const marker = L.marker([latDec, lngDec]).addTo(map);
      marker.bindPopup(`
        <b>${fileName}</b><br>
        Lat: ${latDec}<br>
        Lng: ${lngDec}<br>
        <img src="${url}" width="200">
      `);
    });
  };
}

// GitHub API から photos フォルダ内のファイル一覧を取得
fetch(API_URL)
  .then(res => res.json())
  .then(files => {
    files.forEach(file => {
      if (file.name.toLowerCase().endsWith(".jpg") ||
          file.name.toLowerCase().endsWith(".jpeg")) {

        // GitHub Pages 上の画像 URL
        const rawURL = `https://${GITHUB_USER}.github.io/${GITHUB_REPO}/${PHOTO_DIR}/${file.name}`;

        loadRemotePhoto(rawURL, file.name);
      }
    });
  })
  .catch(err => console.error("GitHub API エラー:", err));