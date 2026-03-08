/* ============================================================
   樹種2024（共通 overlayControl 利用 + 凡例連動）
   ============================================================ */

// ★ 左下レイヤコントロールが無ければ作成
if (!window.overlayControl) {
  window.overlayControl = L.control.layers({}, {}, { position: "bottomleft" });
  window.overlayControl.addTo(map);
}

/* 凡例生成 */
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

    const toggle = container.querySelector(".legend-toggle");
    const content = container.querySelector(".legend-content");
    toggle.onclick = () => {
      content.style.display = content.style.display === "none" ? "block" : "none";
    };

    return container;
  };

  legend.addTo(map);
  legend.getContainer().style.display = "none";
  return legend;
}

/* VectorGrid スタイル生成 */
function createTreeSpeciesVectorStyle(styleJson) {
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

  return function (properties, zoom) {
    const species = properties["解析樹種"] || properties["樹種"];
    if (!species) return { fill: false, stroke: false };

    const entry = Object.values(colorMap).find(e => {
      const filter = e.filter;
      return filter && filter[2] === species;
    });

    if (!entry) return { fill: false, stroke: false };

    return {
      fill: true,
      fillColor: entry.color,
      fillOpacity: 0.3,
      stroke: false
    };
  };
}

/* ============================================================
   樹種2024レイヤ本体（★ window に公開）
   ============================================================ */

fetch("https://forestgeo.info/opendata/17_ishikawa/noto/treespecies_2024/style.json")
  .then(res => res.json())
  .then(styleJson => {
    const vectorStyle = createTreeSpeciesVectorStyle(styleJson);

    window.layerTREESP2024 = L.vectorGrid.protobuf(
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

    window.overlayControl.addOverlay(window.layerTREESP2024, "樹種2024");

    const legend = createTreeSpeciesLegend(styleJson);

    map.on("overlayadd", e => {
      if (e.name === "樹種2024") {
        legend.getContainer().style.display = "block";
      }
    });

    map.on("overlayremove", e => {
      if (e.name === "樹種2024") {
        legend.getContainer().style.display = "none";
      }
    });

    /* ============================================================
       ★ 樹種2024クリック → 共通ダウンロードページを表示
       ============================================================ */
    window.layerTREESP2024.on("click", function (e) {

      const url = "https://www.geospatial.jp/ckan/dataset/rinya-treespecies-noto2024";

      const popupHtml = `
        <div style="font-size:14px;">
          <b>樹種2024</b><br>
          <a href="${url}" target="_blank" style="color:#0066cc;">
            ダウンロードページを開く
          </a>
        </div>
      `;

      L.popup()
        .setLatLng(e.latlng)
        .setContent(popupHtml)
        .openOn(map);
    });

  });
