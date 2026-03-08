function createHandokuLegend(styleJson) {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    let html = `<div class="legend">
      <div class="legend-toggle">判読図 凡例</div>
      <div class="legend-content">`;

    styleJson.layers.forEach(layer => {
      const paint = layer.paint;
      if (layer.type === "fill") {
        html += `<div><span style="display:inline-block;width:18px;height:18px;background:${paint["fill-color"]};opacity:${paint["fill-opacity"]};border:1px solid #000;"></span> ${layer.id}</div>`;
      }
    });

    html += `</div></div>`;

    const container = L.DomUtil.create("div");
    container.innerHTML = html;

    // 折りたたみ動作
    const toggle = container.querySelector(".legend-toggle");
    const content = container.querySelector(".legend-content");
    toggle.onclick = () => {
      content.style.display = content.style.display === "none" ? "block" : "none";
    };

    return container;
  };

  legend.addTo(map);

  // ★ 初期状態では非表示にする
  legend.getContainer().style.display = "none";

  return legend;
}

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
    layerControl._update();

    const legend = createHandokuLegend(styleJson);

    // ★ レイヤ ON → 凡例表示
    map.on("overlayadd", e => {
      if (e.name === "判読図（ベクタタイル）") {
        legend.getContainer().style.display = "block";
      }
    });

    // ★ レイヤ OFF → 凡例非表示
    map.on("overlayremove", e => {
      if (e.name === "判読図（ベクタタイル）") {
        legend.getContainer().style.display = "none";
      }
    });
  });
