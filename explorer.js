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
   ラスターレイヤー
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


/* ============================================================
   レイヤコントロール（VectorGrid は後で追加）
   ============================================================ */
const layerControl = L.control.layers(
  null,
  {
    "DCHM T-RGB": layerDCHMTRGB,
    "DCHM PNG": layerDCHMPNG,
    "DCHM 樹高グレースケール": layerDCHMGray,
    "地形変化量 T-RGB": layerhenkaTRGB
  },
  { position: "bottomleft" }
).addTo(map);


/* ============================================================
   共通：style.json → VectorGrid スタイル変換（判読図）
   ============================================================ */
function convertStyleJsonToVectorGridStyles(styleJson) {
  const styles = {};

  styleJson.layers.forEach(layer => {
    const id = layer["source-layer"];
    if (!id || !layer.paint) return;

    if (layer.type === "fill") {
      styles[id] = {
        fill: true,
        fillColor: layer.paint["fill-color"] ?? "#888",
        fillOpacity: layer.paint["fill-opacity"] ?? 0.8,
        stroke: false
      };
    }

    if (layer.type === "line") {
      styles[id] = {
        stroke: true,
        color: layer.paint["line-color"] ?? "#000",
        weight: layer.paint["line-width"] ?? 1,
        opacity: layer.paint["line-opacity"] ?? 1
      };
    }

    if (layer.type === "circle") {
      styles[id] = {
        radius: layer.paint["circle-radius"] ?? 3,
        fill: true,
        fillColor: layer.paint["circle-color"] ?? "#000",
        fillOpacity: layer.paint["circle-opacity"] ?? 1,
        stroke: true,
        color: layer.paint["circle-stroke-color"] ?? "#000",
        weight: layer.paint["circle-stroke-width"] ?? 1
      };
    }
  });

  return styles;
}


/* ============================================================
   判読図 凡例
   ============================================================ */
function createHandokuLegend(styleJson) {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = "<strong>判読図 凡例</strong><br>";

    styleJson.layers.forEach(layer => {
      const name = layer.id;
      const paint = layer.paint;

      if (layer.type === "fill") {
        div.innerHTML += `
          <div><span style="
            display:inline-block;
            width:18px;
            height:18px;
            background:${paint["fill-color"]};
            opacity:${paint["fill-opacity"]};
            border:1px solid #000;
          "></span> ${name}</div>
        `;
      }

      if (layer.type === "line") {
        div.innerHTML += `
          <div><span style="
            display:inline-block;
            width:18px;
            height:3px;
            background:${paint["line-color"]};
          "></span> ${name}</div>
        `;
      }

      if (layer.type === "circle") {
        div.innerHTML += `
          <div><span style="
            display:inline-block;
            width:12px;
            height:12px;
            background:${paint["circle-stroke-color"]};
            border-radius:50%;
            border:1px solid #000;
          "></span> ${name}</div>
        `;
      }
    });

    return div;
  };

  legend.addTo(map);
}


/* ============================================================
   判読図（PBF + style.json）
   ============================================================ */
fetch("https://forestgeo.info/opendata/17_ishikawa/noto/handoku_2024/style.json")
  .then(res => res.json())
  .then(styleJson => {
    const vectorStyles = convertStyleJsonToVectorGridStyles(styleJson);

    const layerHANDOKU = L.vectorGrid.protobuf(
      "https://forestgeo.info/opendata/17_ishikawa/noto/handoku_2024/{z}/{x}/{y}.pbf",
      {
        vectorTileLayerStyles: vectorStyles,
        maxZoom: 30,
        minZoom: 12,
        maxNativeZoom: 18,
        interactive: true
      }
    );

    layerControl.addOverlay(layerHANDOKU, "判読図（ベクタタイル）");

    createHandokuLegend(styleJson);
  });


/* ============================================================
   樹種ポリゴン：style.json → 樹種別カラー辞書
   ============================================================ */
function buildTreeSpeciesStyleMap(styleJson) {
  const mapSpecies = {};

  styleJson.layers.forEach(layer => {
    if (layer.type !== "fill") return;
    if (!layer.filter) return;

    const field = layer.filter[1];
    const value = layer.filter[2];

    mapSpecies[value] = {
      field: field,
      color: layer.paint["fill-color"],
      opacity: layer.paint["fill-opacity"],
      label: layer.id
    };
  });

  return mapSpecies;
}


/* ============================================================
   樹種ポリゴン：VectorGrid スタイル関数
   ============================================================ */
function createTreeSpeciesVectorStyle(styleMap) {
  return function (properties, zoom) {
    const species =
      properties["解析樹種"] ||
      properties["樹種"];

    if (species && styleMap[species]) {
      return {
        fill: true,
        fillColor: styleMap[species].color,
        fillOpacity: styleMap[species].opacity,
        stroke: false
      };
    }

    return {
      fill: true,
      fillColor: "#cccccc",
      fillOpacity: 0.5,
      stroke: false
    };
  };
}


/* ============================================================
   樹種ポリゴン 凡例
   ============================================================ */
function createTreeSpeciesLegend(styleMap) {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = "<strong>樹種ポリゴン 凡例</strong><br>";

    Object.keys(styleMap).forEach(key => {
      const item = styleMap[key];

      div.innerHTML += `
        <div>
          <span style="
            display:inline-block;
            width:18px;
            height:18px;
            background:${item.color};
            opacity:${item.opacity};
            border:1px solid #000;
          "></span>
          ${item.label}
        </div>
      `;
    });

    return div;
  };

  legend.addTo(map);
}


/* ============================================================
   樹種2024（PBF + style.json）
   ============================================================ */
fetch("https://forestgeo.info/opendata/17_ishikawa/noto/treespecies_2024/style.json")
  .then(res => res.json())
  .then(styleJson => {
    const styleMap = buildTreeSpeciesStyleMap(styleJson);

    const layerTREESP2024 = L.vectorGrid.protobuf(
      "https://forestgeo.info/opendata/17_ishikawa/noto/treespecies_2024/{z}/{x}/{y}.pbf",
      {
        vectorTileLayerStyles: {
          "樹種ポリゴン": createTreeSpeciesVectorStyle(styleMap)
        },
        maxZoom: 30,
        minZoom: 8,
        maxNativeZoom: 18,
        interactive: true
      }
    );

    layerControl.addOverlay(layerTREESP2024, "樹種2024（ベクタタイル）");

    createTreeSpeciesLegend(styleMap);
  });
