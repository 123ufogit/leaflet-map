/* ============================================================
   森林資源メッシュ20m（共通 overlayControl 利用）
   ============================================================ */

// ★ 左下レイヤコントロールが無ければ作成
if (!window.overlayControl) {
  window.overlayControl = L.control.layers({}, {}, { position: "bottomleft" });
  window.overlayControl.addTo(map);
}

/* スタイル（線のみ・塗りなしの例） */
const mesh20mStyle = {
  "全国森林資源メッシュ": () => ({
    stroke: true,
    color: "#888",
    weight: 0.1,
    fill: false
  })
};

/* メッシュ20mレイヤ本体 */
const layerMesh20m = L.vectorGrid.protobuf(
  "https://rinya-tiles.geospatial.jp/fr_mesh20m_pbf_2025/{z}/{x}/{y}.pbf",
  {
    vectorTileLayerStyles: mesh20mStyle,
    maxZoom: 30,
    minZoom: 13,
    interactive: false
  }
);

// ★ 共通 overlayControl に追加
window.overlayControl.addOverlay(layerMesh20m, "森林資源メッシュ20m");
