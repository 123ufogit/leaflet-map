/* ============================================================
   森林資源メッシュ20m（共通 overlayControl 利用）
   ============================================================ */

// ★ 左下レイヤコントロールが無ければ作成
if (!window.overlayControl) {
  window.overlayControl = L.control.layers({}, {}, { position: "bottomleft" });
  window.overlayControl.addTo(map);
}

/* ============================================================
   属性表示（サイドバー）
   ============================================================ */
function showMeshAttributes(props) {
  let html = "<table class='attr-table'>";
  for (let key in props) {
    html += `<tr><td><b>${key}</b></td><td>${props[key]}</td></tr>`;
  }
  html += "</table>";

  // ★ サイドバーの属性表示エリア（IDは必要に応じて変更）
  document.getElementById("attrContent").innerHTML = html;
}

/* ============================================================
   スタイル（クリック判定を広げるため透明 fill を追加）
   ============================================================ */
const mesh20mStyle = {
  "全国森林資源メッシュ": () => ({
    stroke: true,
    color: "#888",
    weight: 0.1,

    // ★ クリック判定を広げるために透明 fill を有効化
    fill: true,
    fillColor: "#000000",
    fillOpacity: 0.01   // ほぼ透明（見た目は変わらない）
  })
};

/* ============================================================
   メッシュ20mレイヤ本体
   ============================================================ */
const layerMesh20m = L.vectorGrid.protobuf(
  "https://rinya-tiles.geospatial.jp/fr_mesh20m_pbf_2025/{z}/{x}/{y}.pbf",
  {
    vectorTileLayerStyles: mesh20mStyle,
    maxZoom: 30,
    minZoom: 13,
    interactive: true   // ★ 属性取得には true が必須
  }
);

// ★ 共通 overlayControl に追加
window.overlayControl.addOverlay(layerMesh20m, "森林資源メッシュ20m");

/* ============================================================
   クリックしたメッシュの属性を取得
   ============================================================ */
layerMesh20m.on("click", function (e) {
  const props = e.layer.properties;
  if (props) {
    showMeshAttributes(props);
  }
});
