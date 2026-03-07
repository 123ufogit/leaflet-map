const layerDCHM50 = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/dchm_terrainRGB_2024/{z}/{x}/{y}.png",
  {
    attribution: "林野庁・DCHM（Terrain-RGB）",
    maxZoom: 30,
    maxNativeZoom: 18,
    opacity: 0.5
  }
);


/* ===== レイヤコントロール ===== */
L.control.layers(
  null,
  {
    "DCHM": layerDCHM50
  },
  { position: "bottomleft" }
).addTo(map);
