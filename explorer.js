/* ============================================================
   Terrain-RGB → 樹高グレースケール変換レイヤー
   ============================================================ */
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

        const elevation = (R * 256 * 256 + G * 256 + B) * 0.1 - 10000;

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


/* ============================================================
   タイルレイヤー
   ============================================================ */
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

const layerDCHMGray = new L.TileLayer.TerrainGray(
  "https://forestgeo.info/opendata/17_ishikawa/noto/dchm_terrainRGB_2024/{z}/{x}/{y}.png",
  {
    attribution: "DCHM 樹高グレースケール",
    maxZoom: 30,
    maxNativeZoom: 18,
    opacity: 0.8
  }
);

const layerORTHO2024 = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/orthophoto_2024/{z}/{x}/{y}.webp",
  {
    attribution: "林野庁・簡易オルソ画像",
    maxZoom: 30,
    maxNativeZoom: 18,
    opacity: 0.5
  }
);

const layerTREESP = L.tileLayer(
  "https://www.geospatial.jp/ckan/dataset/rinya-treespecies-noto2024",
  {
    attribution: "林野庁・樹種ポリゴン",
    maxZoom: 30,
    maxNativeZoom: 18,
    opacity: 0.8
  }
);


/* ============================================================
   レイヤコントロール（すべてオーバーレイヤ）
   ============================================================ */
const layerControl = L.control.layers(
  null,   // ← ベースレイヤなし
  {
    "DCHM T-RGB": layerDCHMTRGB,
    "DCHM PNG": layerDCHMPNG,
    "DCHM 樹高グレースケール": layerDCHMGray,
    "地形変化量 T-RGB": layerhenkaTRGB,
    "樹種ポリゴン": layerTREESP,
    "簡易オルソ": layerORTHO2024
  },
  { position: "bottomleft" }
).addTo(map);


/* ============================================================
   判読図（PBF + style.json）ベクタタイル
   ============================================================ */
fetch("https://forestgeo.info/opendata/17_ishikawa/noto/handoku_2024/style.json")
  .then(res => res.json())
  .then(style => {

    const layerStyles = {};

    style.layers.forEach(layer => {
      if (!layer.paint) return;

      if (layer.type === "fill") {
        layerStyles[layer.id] = {
          fill: true,
          fillColor: layer.paint["fill-color"] ?? "#888",
          fillOpacity: layer.paint["fill-opacity"] ?? 0.8,
          stroke: false
        };
      }

      if (layer.type === "line") {
        layerStyles[layer.id] = {
          stroke: true,
          color: layer.paint["line-color"] ?? "#000",
          weight: layer.paint["line-width"] ?? 1,
          opacity: layer.paint["line-opacity"] ?? 1
        };
      }

      if (layer.type === "symbol") {
        layerStyles[layer.id] = { icon: false };
      }
    });

    const layerHANDOKU = L.vectorGrid.protobuf(
      "https://forestgeo.info/opendata/17_ishikawa/noto/handoku_2024/{z}/{x}/{y}.pbf",
      {
        vectorTileLayerStyles: layerStyles,
        maxZoom: 30,
        minZoom: 10,
        interactive: true
      }
    );

    layerControl.addOverlay(layerHANDOKU, "判読図（ベクタタイル）");
  });
