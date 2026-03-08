/* ============================================================
   判読図2024（共通 overlayControl 利用 + 凡例連動）
   ============================================================ */

// ★ 左下レイヤコントロールが無ければ作成
if (!window.overlayControl) {
  window.overlayControl = L.control.layers({}, {}, { position: "bottomleft" });
  window.overlayControl.addTo(map);
}

/* 凡例生成 */
function createHandokuLegend(styleJson) {
  const legend = L.control({ position: "bottomleft" });

  legend.onAdd = function () {
    let html = `<div class="legend">
      <div class="legend-toggle">判読図2024 凡例</div>
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
      if (layer.type === "line") {
        html += `
          <div>
            <span style="display:inline-block;width:18px;height:2px;
              background:${layer.paint["line-color"]};
              border:1px solid #000;"></span>
            ${layer.id}
          </div>`;
      }
      if (layer.type === "circle") {
        html += `
          <div>
            <span style="display:inline-block;width:10px;height:10px;
              background:${layer.paint["circle-stroke-color"]};
              border-radius:50%;"></span>
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

/* VectorGrid スタイル生成（複数 source-layer 対応） */
function convertHandokuStyles(styleJson) {
  const styles = {};

  styleJson.layers.forEach(layer => {
    const src = layer["source-layer"];

    if (layer.type === "fill") {
      styles[src] = {
        fill: true,
        fillColor: layer.paint["fill-color"],
        fillOpacity: layer.paint["fill-opacity"],
        stroke: false
      };
    }

    if (layer.type === "line") {
      styles[src] = {
        stroke: true,
        color: layer.paint["line-color"],
        weight: layer.paint["line-width"]
      };
    }

    if (layer.type === "circle") {
      styles[src] = {
        fill: true,
        fillColor: layer.paint["circle-stroke-color"],
        fillOpacity: layer.paint["circle-opacity"],
        stroke: false
      };
    }
  });

  return styles;
}

/* 判読図レイヤ本体 */
fetch("https://forestgeo.info/opendata/17_ishikawa/noto/handoku_2024/style.json")
  .then(res => res.json())
  .then(styleJson => {
    const vectorStyles = convertHandokuStyles(styleJson);

    const layerHANDOKU = L.vectorGrid.protobuf(
      "https://forestgeo.info/opendata/17_ishikawa/noto/handoku_2024/{z}/{x}/{y}.pbf",
      {
        vectorTileLayerStyles: vectorStyles,
        maxZoom: 30,
        minZoom: 12,
        interactive: true
      }
    );

    window.overlayControl.addOverlay(layerHANDOKU, "判読図2024");

    const legend = createHandokuLegend(styleJson);

    map.on("overlayadd", e => {
      if (e.name === "判読図2024") {
        legend.getContainer().style.display = "block";
      }
    });

    map.on("overlayremove", e => {
      if (e.name === "判読図2024") {
        legend.getContainer().style.display = "none";
      }
    });
  });

// ★ 判読図クリック → 共通ダウンロードページを表示
layerHANDOKU.on("click", function (e) {

  const url = "https://www.geospatial.jp/ckan/dataset/rinya-handoku-2024";

  const popupHtml = `
    <div style="font-size:14px;">
      <b>判読図2024</b><br>
      <a href="${url}" target="_blank" style="color:#0066cc;">
        判読図2024のダウンロードページを開く
      </a>
    </div>
  `;

  L.popup()
    .setLatLng(e.latlng)
    .setContent(popupHtml)
    .openOn(map);
});
