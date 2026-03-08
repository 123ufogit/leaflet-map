function createTreeSpeciesLegend(styleMap) {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    let html = `<div class="legend">
      <div class="legend-toggle">樹種ポリゴン 凡例</div>
      <div class="legend-content">`;

    Object.keys(styleMap).forEach(key => {
      const item = styleMap[key];
      html += `<div><span style="display:inline-block;width:18px;height:18px;background:${item.color};opacity:${item.opacity};border:1px solid #000;"></span> ${item.label}</div>`;
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

fetch("https://forestgeo.info/opendata/17_ishikawa/noto/treespecies_2024/style.json")
  .then(res => res.json())
  .then(styleJson => {
    const styleMap = buildTreeSpeciesStyleMap(styleJson);

    const layerTREESP2024 = L.vectorGrid.protobuf(
      "https://forestgeo.info/opendata/17_ishikawa/noto/treespecies_2024/{z}/{x}/{y}.pbf",
      {
        vectorTileLayerStyles: { "樹種ポリゴン": createTreeSpeciesVectorStyle(styleMap) },
        maxZoom: 30,
        minZoom: 8,
        maxNativeZoom: 18,
        interactive: true
      }
    );

    layerControl.addOverlay(layerTREESP2024, "樹種2024（ベクタタイル）");
    layerControl._update();

    const legend = createTreeSpeciesLegend(styleMap);

    // ★ レイヤ ON → 凡例表示
    map.on("overlayadd", e => {
      if (e.name === "樹種2024（ベクタタイル）") {
        legend.getContainer().style.display = "block";
      }
    });

    // ★ レイヤ OFF → 凡例非表示
    map.on("overlayremove", e => {
      if (e.name === "樹種2024（ベクタタイル）") {
        legend.getContainer().style.display = "none";
      }
    });
  });
