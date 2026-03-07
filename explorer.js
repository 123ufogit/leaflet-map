/* ===== Terrain-RGB → 樹高グレースケール変換レイヤー ===== */
L.TileLayer.TerrainGray = L.TileLayer.extend({
  createTile: function (coords, done) {
    const tile = document.createElement("canvas");
    tile.width = 256;
    tile.height = 256;
    const ctx = tile.getContext("2d");

    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, 256, 256);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const R = data[i];
        const G = data[i + 1];
        const B = data[i + 2];

        // Terrain-RGB → 標高値（m）
        const elevation = (R * 256 * 256 + G * 256 + B) * 0.1 - 10000;

        // 樹高（0〜50m）を想定したグレースケール
        const min = 0;
        const max = 50;
        let gray = (elevation - min) / (max - min) * 255;
        gray = Math.max(0, Math.min(255, gray));
        gray = 255 - gray;
        data[i] = data[i + 1] = data[i + 2] = gray;
      }

      ctx.putImageData(imgData, 0, 0);
      done(null, tile);
    };

    img.src = this.getTileUrl(coords);
    return tile;
  }
});

/* ===== 既存レイヤー ===== */
const layerDCHMTRGB = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/dchm_terrainRGB_2024/{z}/{x}/{y}.png",
  {
    attribution: "林野庁・DCHM（T-RGB）",
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

const layerhenkaTRGB = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/henka_terrainRGB_2024/{z}/{x}/{y}.png",
  {
    attribution: "林野庁・地形変化量データ(T-RGB)",
    maxZoom: 30,
    maxNativeZoom: 18,
    opacity: 0.5
  }
);

/* ===== 新規追加：Terrain-RGB → 樹高グレースケール ===== */
const layerDCHMGray = new L.TileLayer.TerrainGray(
  "https://forestgeo.info/opendata/17_ishikawa/noto/dchm_terrainRGB_2024/{z}/{x}/{y}.png",
  {
    attribution: "DCHM 樹高グレースケール",
    maxZoom: 30,
    maxNativeZoom: 18,
    opacity: 0.8
  }
);

/* ===== 林野庁・簡易オルソ画像（能登地域2024） ===== */
const layerORTHO2024 = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/orthophoto_2024/{z}/{x}/{y}.webp",
  {
    attribution: "林野庁・簡易オルソ画像",
    maxZoom: 30,
    maxNativeZoom: 18,
  }
);

/* ===== 林野庁・樹種ポリゴン（能登地域2024）===== */
const layerTREESP = L.tileLayer(
  "https://www.geospatial.jp/ckan/dataset/rinya-treespecies-noto2024",
  {
    attribution: "林野庁・樹種ポリゴン",
    maxZoom: 30,
    maxNativeZoom: 18,
    opacity: 0.8
  }
)

/* ===== レイヤコントロール ===== */
L.control.layers(
  null,
  {
    "DCHM T-RGB": layerDCHMTRGB,
    "DCHM PNG": layerDCHMPNG,
    "DCHM 樹高グレースケール": layerDCHMGray,
    "地形変化量 T-RGB": layerhenka,
    "樹種ポリゴン": layerTREESP,
    "簡易オルソ": layerORTHO2024
  },
  { position: "bottomleft" }
).addTo(map);
