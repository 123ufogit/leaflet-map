/*
  photo.js version 1.4.0
  Updated: 2026-01-17
  Changes:
    - GPS位置情報がない画像に対応
    - 地図上の座標を指定して疑似EXIF情報を追加
    - ファイル名と座標をCSV形式でエクスポート
*/

const photoDataList = [];
let geoTaggingMode = false;  // 位置情報付加モード
let geoTaggingFile = null;   // 位置情報付加対象ファイル

/* ===== 360°判定 ===== */
function detect360(imgURL, callback) {
  const img = new Image();
  img.onload = () => {
    const ratio = img.width / img.height;
    callback(Math.abs(ratio - 2.0) < 0.05);
  };
  img.src = imgURL;
}

/* ============================================================
    写真読み込みの共通処理（photoInput & Drag&Drop 両対応）
    ============================================================ */
function loadPhotoFile(file) {

  EXIF.getData(file, function () {
    const lat = EXIF.getTag(this, "GPSLatitude");
    const lng = EXIF.getTag(this, "GPSLongitude");
    const latRef = EXIF.getTag(this, "GPSLatitudeRef");
    const lngRef = EXIF.getTag(this, "GPSLongitudeRef");
    const dateTime = EXIF.getTag(this, "DateTimeOriginal");

    // GPS位置情報がない場合 → 位置情報付加モード
    if (!lat || !lng) {
      if (confirm(
        `${file.name} にはGPS位置情報がありません。\n\n` +
        `地図上の現在の中心座標に位置情報を付加しますか？\n\n` +
        `現在の座標: ${map.getCenter().lat.toFixed(6)}, ${map.getCenter().lng.toFixed(6)}`
      )) {
        startGeoTagging(file);
      }
      return;
    }

    function toDecimal(dms) {
      return dms[0] + dms[1] / 60 + dms[2] / 3600;
    }

    let latDec = toDecimal(lat);
    let lngDec = toDecimal(lng);

    if (latRef === "S") latDec *= -1;
    if (lngRef === "W") lngDec *= -1;

    processPhotoWithCoordinates(file, latDec, lngDec, dateTime);
  });
}

/* ============================================================
    位置情報付加モード開始
    ============================================================ */
function startGeoTagging(file) {
  geoTaggingMode = true;
  geoTaggingFile = file;

  alert(
    "位置情報付加モード\n\n" +
    "地図を操作して、写真を撮影した場所に中心を移動してください。\n" +
    "準備ができたら『位置情報を付加』ボタンをクリックしてください。"
  );

  // UI: 位置情報付加パネルを表示
  showGeoTaggingPanel();
}

/* ============================================================
    位置情報付加パネル表示
    ============================================================ */
function showGeoTaggingPanel() {
  let panel = document.getElementById("geoTaggingPanel");
  
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "geoTaggingPanel";
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border: 2px solid #007bff;
      border-radius: 8px;
      padding: 20px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 400px;
      text-align: center;
    `;
    document.body.appendChild(panel);
  }

  const center = map.getCenter();
  panel.innerHTML = `
    <h3 style="margin-top:0;">位置情報を付加</h3>
    <p style="margin:10px 0; font-size:14px;">
      ファイル: <b>${geoTaggingFile.name}</b>
    </p>
    <p style="margin:10px 0; font-size:14px;">
      現在の座標:<br>
      <b>Lat: ${center.lat.toFixed(6)}</b><br>
      <b>Lng: ${center.lng.toFixed(6)}</b>
    </p>
    <div style="margin-top:20px;">
      <button id="confirmGeoBtn" style="
        padding: 10px 20px;
        margin-right: 10px;
        background: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">この座標で付加</button>
      <button id="cancelGeoBtn" style="
        padding: 10px 20px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">キャンセル</button>
    </div>
  `;

  document.getElementById("confirmGeoBtn").onclick = () => {
    const c = map.getCenter();
    processPhotoWithCoordinates(geoTaggingFile, c.lat, c.lng, "指定座標");
    panel.style.display = "none";
    geoTaggingMode = false;
    geoTaggingFile = null;
  };

  document.getElementById("cancelGeoBtn").onclick = () => {
    panel.style.display = "none";
    geoTaggingMode = false;
    geoTaggingFile = null;
  };
}

/* ============================================================
    座標が確定した後の処理
    ============================================================ */
function processPhotoWithCoordinates(file, latDec, lngDec, dateTime) {
  const imgURL = URL.createObjectURL(file);
  const fileName = file.name;
  const shotTime = dateTime ? dateTime : "不明";

  detect360(imgURL, (is360) => {

    /* ===== popup HTML（index は push 後に確定するため仮ID） ===== */
    let popupHTML = "";

    if (is360) {
      popupHTML = `
        <div class="pano-box" id="pano_temp"></div>
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

    /* ===== push の後で index を確定 ===== */
    const data = {
      lat: latDec,
      lng: lngDec,
      fileName,
      imgURL,
      marker,
      shotTime,
      is360,
      originalFile: file  // 元ファイル保存
    };

    photoDataList.push(data);
    const index = photoDataList.length - 1;

    /* ===== popupopen 時に pano ID を index に差し替えて初期化 ===== */
    marker.on("popupopen", () => {
      if (is360) {
        setTimeout(() => {
          const popupEl = document.getElementById("pano_temp");
          if (popupEl) popupEl.id = `pano_${index}`;

          pannellum.viewer(`pano_${index}`, {
            type: "equirectangular",
            panorama: imgURL,
            autoLoad: true,
            showFullscreenCtrl: true
          });
        }, 200);
      }
    });

    /* ===== サムネイル生成 ===== */
    addThumbnail(index);
  });
}

/* ============================================================
    photoInput（ファイル選択）イベント
    ============================================================ */
document.getElementById("photoInput").onchange = function (e) {
  const files = e.target.files;
  for (let file of files) {
    loadPhotoFile(file);
  }
};

/* ============================================================
    ドラッグ＆ドロップ（ドロップゾーン＝サイドバー全域）
    ============================================================ */

const sidebar = document.getElementById("sidebar");
const dropHint = document.getElementById("dropHint");

/* dragenter */
sidebar.addEventListener("dragenter", (e) => {
  e.preventDefault();
  sidebar.classList.add("dragover");
});

/* dragover */
sidebar.addEventListener("dragover", (e) => {
  e.preventDefault();
});

/* dragleave */
sidebar.addEventListener("dragleave", () => {
  sidebar.classList.remove("dragover");
});

/* drop */
sidebar.addEventListener("drop", (e) => {
  e.preventDefault();
  sidebar.classList.remove("dragover");

  const files = e.dataTransfer.files;

  if (dropHint) dropHint.style.display = "none";

  for (let file of files) {
    if (file.type.match("image.*")) {
      loadPhotoFile(file);
    }
  }
});

/* ============================================================
    サムネイル生成
    ============================================================ */
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
    tag360.style.fontSize = "10px";
    tag360.style.padding = "2px 4px";
    tag360.style.borderRadius = "3px";
    item.appendChild(tag360);
  }

  /* ===== CSV形式でエクスポートボタン ===== */
  const exportBtn = document.createElement("button");
  exportBtn.textContent = "CSV";
  exportBtn.title = "座標情報をCSV形式でコピー";
  exportBtn.style.cssText = `
    position: absolute;
    top: 4px;
    right: 30px;
    background: #17a2b8;
    color: white;
    border: none;
    border-radius: 3px;
    padding: 2px 6px;
    cursor: pointer;
    font-size: 11px;
  `;
  
  exportBtn.onclick = (event) => {
    event.stopPropagation();
    copyToClipboardCSV(index);
  };
  item.appendChild(exportBtn);

  const delBtn = document.createElement("div");
  delBtn.textContent = "×";
  delBtn.style.position = "absolute";
  delBtn.style.top = "4px";
  delBtn.style.right = "6px";
  delBtn.style.cursor = "pointer";
  delBtn.style.color = "#c00";
  delBtn.style.fontWeight = "bold";
  delBtn.style.fontSize = "16px";

  delBtn.onclick = (event) => {
    event.stopPropagation();
    map.removeLayer(data.marker);
    photoDataList.splice(index, 1);
    list.removeChild(item);
    refreshThumbnailIndexes();
  };

  item.onclick = () => {
    map.setView([data.lat, data.lng], 16);
    data.marker.openPopup();
  };

  item.appendChild(img);
  item.appendChild(name);
  item.appendChild(time);
  item.appendChild(latlng);
  item.appendChild(delBtn);
  list.appendChild(item);
}

/* ============================================================
    CSV形式でクリップボードにコピー（単一画像）
    ============================================================ */
function copyToClipboardCSV(index) {
  const data = photoDataList[index];
  const csvLine = `${data.fileName},${data.lat.toFixed(6)},${data.lng.toFixed(6)}`;
  
  navigator.clipboard.writeText(csvLine).then(() => {
    alert(`クリップボードにコピーしました\n\n${csvLine}`);
  }).catch(() => {
    alert("クリップボードへのコピーに失敗しました");
  });
}

/* ============================================================
    全画像をCSV形式でエクスポート
    ============================================================ */
function exportAllPhotosAsCSV() {
  if (photoDataList.length === 0) {
    alert("リストに画像がありません");
    return;
  }

  // ヘッダー行
  let csv = "ファイル名,緯度,経度\n";
  
  // データ行
  photoDataList.forEach(data => {
    csv += `${data.fileName},${data.lat.toFixed(6)},${data.lng.toFixed(6)}\n`;
  });

  // クリップボードにコピー
  navigator.clipboard.writeText(csv).then(() => {
    alert(`全${photoDataList.length}件をCSV形式でコピーしました\n\n${csv}`);
  }).catch(() => {
    alert("クリップボードへのコピーに失敗しました");
  });
}

/* ============================================================
    タブボタンにエクスポート機能を追加
    ============================================================ */
window.addEventListener("load", () => {
  const tabPhoto = document.getElementById("tabPhoto");
  
  // 既存テキスト
  const origText = tabPhoto.textContent;
  
  // エクスポートボタンを追加
  const exportAllBtn = document.createElement("button");
  exportAllBtn.textContent = "📥 全件CSV";
  exportAllBtn.title = "全画像の座標をCSV形式でコピー";
  exportAllBtn.style.cssText = `
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 12px;
  `;
  
  exportAllBtn.onclick = exportAllPhotosAsCSV;
  
  // タブボタンをrelativeに
  tabPhoto.style.position = "relative";
  tabPhoto.appendChild(exportAllBtn);
});

/* ============================================================
    サムネイル再構築
    ============================================================ */
function refreshThumbnailIndexes() {
  const list = document.getElementById("photoList");
  list.innerHTML = "";
  photoDataList.forEach((_, i) => addThumbnail(i));
}
