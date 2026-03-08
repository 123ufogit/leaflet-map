/* ============================================================
   DCHM / 地形変化量 / 樹高グレースケール（共通 overlayControl 利用）
   ============================================================ */
if (!window.overlayControl) {
  window.overlayControl = L.control.layers({}, {}, { position: "bottomleft" });
  window.overlayControl.addTo(map);
}

/* ============================================================
   DCHM T-RGB → 樹高グレースケール（樹高が低いほど透明）
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

        const height = (R * 256 * 256 + G * 256 + B) * 0.1 - 10000;
        const h = Math.max(0, Math.min(50, height));

        let gray = (h / 50) * 255;
        gray = 255 - gray;

        const alpha = Math.floor((h / 50) * 255);

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
        data[i + 3] = alpha;
      }

      ctx.putImageData(imgData, 0, 0);
      done(null, tile);
    };

    img.src = this.getTileUrl(coords);
    return tile;
  }
});

/* ============================================================
   地形変化量 T-RGB → 赤〜透明〜青（-1〜1 は完全透明）
   ============================================================ */
L.TileLayer.HenkaRB = L.TileLayer.extend({
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

        // ★ T-RGB → 地形変化量（cm）
        const value = (R * 256 * 256 + G * 256 + B) * 0.1 - 10000;

        // ★ -20〜20 にクランプ
        const v = Math.max(-20, Math.min(20, value));

        let r = 0, g = 0, b = 0, a = 255;

        // ★ -1〜1 は完全透明
        if (v >= -1 && v <= 1) {
          a = 0;
        }
        else if (v < -1) {
          // -20（赤）→ -1（透明）
          const t = (v + 20) / 19; // -20→0, -1→1
          r = 255;
          g = 0;
          b = 0;
          a = Math.floor(t * 255);
        }
        else if (v > 1) {
          // 1（透明）→ +20（青）
          const t = (v - 1) / 19; // 1→0, 20→1
          r = 0;
          g = 0;
          b = 255;
          a = Math.floor(t * 255);
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = a;
      }

      ctx.putImageData(imgData, 0, 0);
      done(null, tile);
    };

    img.src = this.getTileUrl(coords);
    return tile;
  }
});

/* ============================================================
   ラスターレイヤー
   ============================================================ */
const layerDEMPNG = L.tileLayer(
  "https://rinya-tiles.geospatial.jp/dem_r06eq_2025/{z}/{x}/{y}.png",
  { attribution: "林野庁・DEM（PNG）", maxZoom: 30, maxNativeZoom: 18, opacity: 0.5 }
);

const layerDEMTRGB = L.tileLayer(
  "https://rinya-tiles.geospatial.jp/terrainRGB_r06eq_2025/{z}/{x}/{y}.png",
  { attribution: "林野庁・DEM（T-RGB）", maxZoom: 30, maxNativeZoom: 18, opacity: 0.5 }
);

const layerCSMap = L.tileLayer(
  "https://rinya-tiles.geospatial.jp/csmap_r06eq_2025/{z}/{x}/{y}.webp",
  { attribution: "林野庁・CS立体図", maxZoom: 30, maxNativeZoom: 18, opacity: 0.5 }
);

const layerDCHMTRGB = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/dchm_terrainRGB_2024/{z}/{x}/{y}.png",
  { attribution: "林野庁・DCHM（T-RGB）", maxZoom: 30, maxNativeZoom: 18, opacity: 0.5 }
);

const layerDCHMPNG = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/dchm_2024/{z}/{x}/{y}.png",
  { attribution: "林野庁・DCHM（PNG）", maxZoom: 30, maxNativeZoom: 18, opacity: 0.5 }
);

const layerhenkaPNG = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/henka_2024/{z}/{x}/{y}.png",
  { attribution: "林野庁・地形変化量(PNG)", maxZoom: 30, maxNativeZoom: 18, opacity: 0.5 }
);

const layerhenkaTRGB = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/henka_terrainRGB_2024/{z}/{x}/{y}.png",
  { attribution: "林野庁・地形変化量(T-RGB)", maxZoom: 30, maxNativeZoom: 18, opacity: 0.5 }
);

const layerDCHMGray = new L.TileLayer.TerrainGray(
  "https://forestgeo.info/opendata/17_ishikawa/noto/dchm_terrainRGB_2024/{z}/{x}/{y}.png",
  { attribution: "DCHM グレースケール加工（透明度付き）", maxZoom: 30, maxNativeZoom: 18 }
);

const layerORTHO2024 = L.tileLayer(
  "https://forestgeo.info/opendata/17_ishikawa/noto/orthophoto_2024/{z}/{x}/{y}.webp",
  { attribution: "林野庁・簡易オルソ画像（2024）", maxZoom: 30, maxNativeZoom: 18 }
);

/* ============================================================
   ★ 地形変化量 2色スケール加工レイヤー
   ============================================================ */
const layerhenkaRB = new L.TileLayer.HenkaRB(
  "https://forestgeo.info/opendata/17_ishikawa/noto/henka_terrainRGB_2024/{z}/{x}/{y}.png",
  { attribution: "地形変化量 2色スケール加工", maxZoom: 30, maxNativeZoom: 18 }
);

/* ============================================================
   ★ 共通 overlayControl に追加（左下）
   ============================================================ */
window.overlayControl.addOverlay(layerDEMPNG, "DEM PNG");
window.overlayControl.addOverlay(layerDEMTRGB, "DEM T-RGB");
window.overlayControl.addOverlay(layerCSMap, "CS立体図");
window.overlayControl.addOverlay(layerDCHMTRGB, "DCHM T-RGB");
window.overlayControl.addOverlay(layerDCHMPNG, "DCHM PNG");
window.overlayControl.addOverlay(layerhenkaPNG, "地形変化量 PNG");
window.overlayControl.addOverlay(layerhenkaTRGB, "地形変化量 T-RGB");
window.overlayControl.addOverlay(layerDCHMGray, "DCHM グレースケール加工");
window.overlayControl.addOverlay(layerhenkaRB, "地形変化量 2色スケール加工");
window.overlayControl.addOverlay(layerORTHO2024, "簡易オルソ");
