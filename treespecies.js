/* ============================================================
   樹種2024（独立レイヤコントロール + 凡例連動）
   map.js は変更しない
   ============================================================ */

// ★ 樹種レイヤ専用のレイヤコントロール（左下）
const treeLayerControl = L.control.layers({}, {}, { position: "bottomleft" });
treeLayerControl.addTo(map);

/* ------------------------------------------------------------
   凡例生成
------------------------------------------------------------ */
function createTreeSpeciesLegend(styleJson) {
  const legend = L.control({ position: "bottomleft" });

  legend.onAdd = function () {
    let html = `<div class="legend">
      <div class="legend-toggle">樹種2024 凡例</div>
      <div class="legend-content">`;

    styleJson.layers.forEach(layer => {
      if (layer.type === "fill") {
        html += `
          <div>
            <span style="display:inline-block;width:18px;height:18px;
              background:${layer.paint["fill-color"]};
              opacity:${layer.paint["fill-opacity"]};
              border:1px solid #000;"></span>
            ${layer.id}
          </div>`;
      }
    });

    html += `</div></div>`;

    const container = L.DomUtil.create("div");
    container.innerHTML = html;

    // 折りたたみ
    const toggle = container.querySelector(".legend-toggle");
    const content = container.querySelector(".legend-content");
    toggle.onclick = () => {
      content.style.display = content.style.display === "none" ? "block" : "none";
    };

    return container;
  };

  legend.addTo(map);
  legend.getContainer().style.display = "none"; // 初期非表示
  return legend;
}

/* ------------------------------------------------------------
   VectorGrid スタイル生成
   （source-layer = "樹種ポリゴン" の単一レイヤ構造）
------------------------------------------------------------ */
function createTreeSpeciesVectorStyle(styleJson) {
  // style.json の id → color をマップ化
  const colorMap = {};
  styleJson.layers.forEach(layer => {
    if (layer.type === "fill") {
      colorMap[layer.id] = {
        color: layer.paint["fill-color"],
        opacity: layer.paint["fill-opacity"],
        filter: layer.filter
      };
    }
  });

  // VectorGrid 用スタイル関数
  return function (properties, zoom) {
    const species = properties["解析樹種"] || properties["樹種"];
    if (!species) {
      return { fill: false, stroke: false };
    }

    // style.json の filter に一致する id を探す
    const entry = Object.values(colorMap).find(e => {
      const filter = e.filter;
      return filter && filter[2] === species;
    });

    if (!entry) {
      return { fill: false, stroke: false };
    }

    return {
      fill: true,
      fillColor: entry.color,
      fillOpacity: 0.5,
      stroke: false
    };
  };
}

/* ------------------------------------------------------------
   樹種2024レイヤ本体
------------------------------------------------------------ */
fetch("https://forestgeo.info/opendata/17_ishikawa/noto/treespecies_2024/style.json")
  .then(res => res.json())
  .then(styleJson => {

    const vectorStyle = createTreeSpeciesVectorStyle(styleJson);

    const layerTREESP2024 = L.vectorGrid.protobuf(
      "https://forestgeo.info/opendata/17_ishikawa/noto/treespecies_2024/{z}/{x}/{y}.pbf",
      {
        vectorTileLayerStyles: {
          "樹種ポリゴン": vectorStyle
        },
        maxZoom: 30,
        minZoom: 8,
        interactive: true
      }
    );

    // ★ 樹種レイヤを左下のコントロールに追加
    treeLayerControl.addOverlay(layerTREESP2024, "樹種2024");

    // ★ 凡例
    const legend = createTreeSpeciesLegend(styleJson);

    // ON → 凡例表示
    map.on("overlayadd", e => {
      if (e.name === "樹種2024") {
        legend.getContainer().style.display = "block";
      }
    });

    // OFF → 凡例非表示
    map.on("overlayremove", e => {
      if (e.name === "樹種2024") {
        legend.getContainer().style.display = "none";
      }
    });
  });
