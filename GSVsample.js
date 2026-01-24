/*
  GSVsample.js
  サンプル写真を最初だけ表示し、
  ユーザーが写真を追加したら自動で非表示にする独立モジュール
*/

let sampleIndex = null;   // サンプルの photoDataList 内の位置
let sampleMarker = null;  // サンプルのマーカー参照

window.addEventListener("load", () => {
  addSamplePhoto();
  hookPhotoAddEvent();
});

/* ============================================================
   サンプル写真の追加（固定パス）
   ============================================================ */
function addSamplePhoto() {

  const imgURL = "leaflet-map/photos/sample.jpg";

  // サンプル写真の座標（任意）
  const lat = 37.303254;
  const lng = 136.915478;

  // 通常マーカー（色は変えない）
  sampleMarker = L.marker([lat, lng]).addTo(map);

  sampleMarker.bindPopup(`
    <div style="text-align:center;">
      <img src="${imgURL}" width="200"><br>
      <b>サンプル写真</b><br>
      Lat: ${lat.toFixed(6)}<br>
      Lng: ${lng.toFixed(6)}
    </div>
  `);

  // photoDataList に追加
  const data = {
    lat,
    lng,
    fileName: "sample.jpg",
    imgURL,
    marker: sampleMarker,
    shotTime: "サンプル",
    is360: false
  };

  photoDataList.push(data);

  // サンプルの index を記録
  sampleIndex = photoDataList.length - 1;

  // サムネイル生成
  addThumbnail(sampleIndex);
}

/* ============================================================
   写真追加をフックしてサンプルを非表示にする
   ============================================================ */
function hookPhotoAddEvent() {

  const input = document.getElementById("photoInput");

  input.addEventListener("change", () => {
    hideSampleIfNeeded();
  });

  // ドラッグ＆ドロップにも対応
  const sidebar = document.getElementById("sidebar");
  sidebar.addEventListener("drop", () => {
    hideSampleIfNeeded();
  });
}

/* ============================================================
   サンプル非表示処理
   ============================================================ */
function hideSampleIfNeeded() {

  // すでに削除済みなら何もしない
  if (sampleIndex === null) return;

  // サンプルを削除
  const list = document.getElementById("photoList");

  // マーカー削除
  if (sampleMarker) {
    map.removeLayer(sampleMarker);
  }

  // photoDataList から削除
  photoDataList.splice(sampleIndex, 1);

  // サムネイル再構築
  list.innerHTML = "";
  photoDataList.forEach((_, i) => addThumbnail(i));

  // 再度削除されないように無効化
  sampleIndex = null;
  sampleMarker = null;
}
