/*
  photo.js version 1.3.1
  Updated: 2026-01-17
  Changes:
    - 非同期処理による index ずれバグを修正
    - photoDataList.push() の後で index を確定
    - pano_ の ID を index に合わせて安全に生成
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
    const latRef = EXIF.getTag(this, "GPSLatitudeRef");
    const lngRef = EXIF.getTag(this, "GPSLongitudeRef");
    const dateTime = EXIF.getTag(this, "DateTimeOriginal");

    if (!lat || !lng) {
      alert(file.name + " にはGPS位置情報がありません。");
      return;
    }

    function toDecimal(dms) {
      return dms[0] + dms[1] / 60 + dms[2] / 3600;
    }

    let latDec = toDecimal(lat);
    let lngDec = toDecimal(lng);

    if (latRef === "S") latDec *= -1;
    if (lngRef === "W") lngDec *= -1;

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
        is360
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
