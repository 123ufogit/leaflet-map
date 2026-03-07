const layerDCHMTRGB = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/dchm_terrainRGB_2024/{z}/{x}/{y}.png",
  {
    attribution: "林野庁・DCHM（Terrain-RGB）",
    maxZoom: 30,
    maxNativeZoom: 18,
    opacity: 0.5
  }
);

const layerDCHMPNG = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/dchm_2024/{z}/{x}/{y}.png",
  {
    attribution: "林野庁・DCHM（PNG）",
    maxZoom: 30,
    maxNativeZoom: 18,
    opacity: 0.5
  }
);

const layerhenka = L.tileLayer(
  "https://www.geospatial.jp/ckan/dataset/rinya-henka-noto2024",
  {
    attribution: "林野庁・地形変化量データ",
    maxZoom: 30,
    maxNativeZoom: 18,
    opacity: 0.5
  }
);

/* ===== レイヤコントロール ===== */
L.control.layers(
  null,
  {
    "DCHM T-RGB": layerDCHMTRGB,
    "DCHM PNG": layerDCHMPNG,
    "地形変化量": layerhenka,    
  },
  { position: "bottomleft" }
).addTo(map);
