/* ============================================================
   森林資源メッシュ20m（空間結合フル実装版）
   ============================================================ */

// ★ 左下レイヤコントロールが無ければ作成
if (!window.overlayControl) {
  window.overlayControl = L.control.layers({}, {}, { position: "bottomleft" });
  window.overlayControl.addTo(map);
}

/* ============================================================
   属性表示（サイドバー）
   ============================================================ */
function showMeshAttributesWithJoin(meshProps, joinProps) {
  let html = "<table class='attr-table'>";

  // 元のメッシュ属性
  for (let key in meshProps) {
    html += `<tr><td><b>${key}</b></td><td>${meshProps[key]}</td></tr>`;
  }

  // 空間結合した属性
  for (let key in joinProps) {
    html += `<tr><td><b>${key}</b></td><td>${joinProps[key]}</td></tr>`;
  }

  html += "</table>";
  document.getElementById("attrContent").innerHTML = html;
}

/* ============================================================
   メッシュ Polygon を作る（VectorGrid → Turf polygon）
   ============================================================ */
function getMeshPolygon(e) {
  const coords = e.layer.geometry[0]; 
  return turf.polygon([coords]);
}

/* ============================================================
   VectorGrid 空間結合（樹種2024・判読図）
   ============================================================ */
async function getVectorGridJoin(vgLayer, layerName, meshPoly) {
  const z = map.getZoom();
  const tile = await vgLayer._getVectorTilePromise(z, meshPoly);
  if (!tile || !tile.layers[layerName]) return null;

  const features = tile.layers[layerName].features;

  for (const f of features) {
    const poly = turf.polygon([f.geometry[0]]);
    if (turf.booleanIntersects(meshPoly, poly)) {
      return f.properties;
    }
  }
  return null;
}

/* ============================================================
   ラスタのピクセル値を Polygon 内でサンプリング
   ============================================================ */
async function sampleRaster(tileLayer, meshPoly) {
  return new Promise(resolve => {
    const bounds = meshPoly.bbox || turf.bbox(meshPoly);
    const z = map.getZoom();

    const pixels = [];

    // 対象タイルを計算
    const tileNW = map.project([bounds[3], bounds[0]], z).divideBy(256).floor();
    const tileSE = map.project([bounds[1], bounds[2]], z).divideBy(256).floor();

    let pending = 0;

    for (let x = tileNW.x; x <= tileSE.x; x++) {
      for (let y = tileNW.y; y <= tileSE.y; y++) {
        pending++;

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = tileLayer.getTileUrl({ x, y, z });

        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);

          const imgData = ctx.getImageData(0, 0, 256, 256).data;

          for (let px = 0; px < 256; px++) {
            for (let py = 0; py < 256; py++) {
              const idx = (py * 256 + px) * 4;
              const R = imgData[idx];
              const G = imgData[idx + 1];
              const B = imgData[idx + 2];

              // TerrainRGB → 樹高
              const h = (R * 256 * 256 + G * 256 + B) * 0.1 - 10000;

              // ピクセルの緯度経度
              const latlng = map.unproject(
                L.point(x * 256 + px, y * 256 + py),
                z
              );

              if (turf.booleanPointInPolygon([latlng.lng, latlng.lat], meshPoly)) {
                pixels.push(h);
              }
            }
          }

          if (--pending === 0) resolve(pixels);
        };

        img.onerror = () => {
          if (--pending === 0) resolve(pixels);
        };
      }
    }
  });
}

/* ============================================================
   DCHM 平均値（無立木地判定付き）
   ============================================================ */
async function getDCHMStats(meshPoly) {
  const pixels = await sampleRaster(layerDCHMPNG, meshPoly);
  if (!pixels.length) return { avg: "" };

  const low = pixels.filter(v => v < 5).length;
  if (low / pixels.length >= 0.5) {
    return { avg: "" }; // 無立木地
  }

  const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;
  return { avg: avg.toFixed(1) };
}

/* ============================================================
   地形変化量 最大値
   ============================================================ */
async function getHenkaMax(meshPoly) {
  const pixels = await sampleRaster(layerhenkaTRGB, meshPoly);
  if (!pixels.length) return { max: "" };

  return { max: Math.max(...pixels).toFixed(1) };
}

/* ============================================================
   メッシュ20mスタイル（透明 fill でクリック判定を広げる）
   ============================================================ */
const mesh20mStyle = {
  "全国森林資源メッシュ": () => ({
    stroke: true,
    color: "#888",
    weight: 0.1,
    fill: true,
    fillColor: "#000000",
    fillOpacity: 0.01
  })
};

/* ============================================================
   メッシュ20mレイヤ本体
   ============================================================ */
const layerMesh20m = L.vectorGrid.protobuf(
  "https://rinya-tiles.geospatial.jp/fr_mesh20m_pbf_2025/{z}/{x}/{y}.pbf",
  {
    vectorTileLayerStyles: mesh20mStyle,
    maxZoom: 30,
    minZoom: 13,
    interactive: true
  }
);

// ★ 初期表示 ON
layerMesh20m.addTo(map);

// ★ overlayControl に登録
window.overlayControl.addOverlay(layerMesh20m, "森林資源メッシュ20m");

/* ============================================================
   クリック → 空間結合 → 属性表示
   ============================================================ */
layerMesh20m.on("click", async function (e) {
  const meshProps = e.layer.properties;
  const meshPoly = getMeshPolygon(e);

  // VectorGrid 結合
  const treesp  = await getVectorGridJoin(layerTREESP2024, "treespecies", meshPoly);
  const handoku = await getVectorGridJoin(layerHANDOKU, "handoku", meshPoly);

  // ラスタ統計
  const dchm  = await getDCHMStats(meshPoly);
  const henka = await getHenkaMax(meshPoly);

  const joinProps = {
    "樹種2024": treesp ? treesp.樹種名 : "",
    "平均樹高(DCHM)": dchm.avg,
    "地形変化量 最大値": henka.max,
    "判読図": handoku ? handoku.分類 : ""
  };

  showMeshAttributesWithJoin(meshProps, joinProps);
});
