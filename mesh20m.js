/* ============================================================
   全国森林資源メッシュ20m（枠線のみ）
   ============================================================ */
const mesh20mStyle = {
  "fr_mesh20m": () => ({
    stroke: true,
    color: "#888",
    weight: 0.1,
    fill: false
  })
};

const layerMesh20m = L.vectorGrid.protobuf(
  "https://rinya-tiles.geospatial.jp/fr_mesh20m_pbf_2025/{z}/{x}/{y}.pbf",
  {
    vectorTileLayerStyles: mesh20mStyle,
    maxZoom: 30,
    minZoom: 8,
    interactive: false
  }
);

layerControl.addOverlay(layerMesh20m, "森林資源メッシュ20m");
