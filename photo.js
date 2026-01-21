/*
  photo.js version 1.0.0
  Updated: 2026-01-13
  Changes:
    - loadPhotoFile() を新規追加（photoInput と D&D の共通処理）
    - ドラッグ＆ドロップ対応
    - コード整理と軽微な最適化
*/

const photoDataList = [];

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

      /* ===== Popup 完全表示後に Pannellum を初期化 ===== */
      marker.on("popupopen", () => {
        if (is360) {
          setTimeout(() => {
            pannellum.viewer(`pano_${index}`, {
              type: "equirectangular",
              panorama: imgURL,
              autoLoad: true,
              showFullscreenCtrl: true
            });
          }, 200);
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
   ドラッグ＆ドロップ対応
   ============================================================ */
const dropzone = document.getElementById("dropzone");

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.style.background = "#eef";
});

dropzone.addEventListener("dragleave", () => {
  dropzone.style.background = "rgba(255,255,255,0.8)";
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.style.background = "rgba(255,255,255,0.8)";

  const files = e.dataTransfer.files;
  for (let file of files) {
    if (file.type.match("image.*")) {
      loadPhotoFile(file);  // ← photoInput と同じ処理
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
   サムネイル再構築
   ============================================================ */
function refreshThumbnailIndexes() {
  const list = document.getElementById("photoList");
  list.innerHTML = "";
  photoDataList.forEach((_, i) => addThumbnail(i));
}
