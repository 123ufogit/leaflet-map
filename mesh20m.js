/* ============================================================
   森林資源メッシュ20m（空間結合フル実装版）
   - 20m メッシュクリック → 以下を空間結合して属性表示
     * 樹種2024（VectorGrid）
     * 判読図（VectorGrid）
     * DCHM PNG 平均値（樹高5m未満が50%以上なら空欄＝無立木地）
     * 地形変化量 T-RGB 最大値
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

  for (let key in meshProps) {
    html += `<tr><td><b>${key}</b></td><td>${meshProps[key]}</td></tr>`;
  }

  for (let key in joinProps) {
    html += `<tr><td><b>${key}</b></td><td>${joinProps[key] ?? ""}</td></tr>`;
  }

  html += "</table>";
  const el = document.getElementById("attrContent");
  if (el) el.innerHTML = html;
}

/* ============================================================
   meshcode から 20m メッシュ Polygon を生成（近似）
   ※ 実際の森林資源メッシュ20m仕様に合わせて調整推奨
   ============================================================ */
function getMeshPolygonFromMeshcode(meshcode) {
  // 数値化
  const code = Number(meshcode);
  if (!Number.isFinite(code)) return null;

  // ここでは「第3次メッシュ相当 + 細分」を想定した近似例
  // lat0, lon0 は「左下隅」の緯度経度
  // UFO の実データ仕様に合わせてここは調整してよい
  const latBase = Math.floor(code / 10000);      // 仮：南北方向インデックス
  const lonBase = code % 10000;                  // 仮：東西方向インデックス

  // 仮の換算（1 インデックス ≒ 1km として、その中を 50×50 で 20m）
  const lat0km = latBase / 1.5;                  // 日本標準地域メッシュの緯度換算の典型
  const lon0km = lonBase / 1.0 + 100;            // 経度換算の典型（東経100度起点）

  // 20m を緯度・経度に換算（近似）
  const dLat = 20 / 111320;                      // 20m → 緯度差
  const dLon = 20 / (111320 * Math.cos(lat0km * Math.PI / 180)); // 20m → 経度差

  const lon0 = lon0km;
  const lat0 = lat0km;

  return turf.polygon([[
    [lon0,        lat0       ],
    [lon0 + dLon, lat0       ],
    [lon0 + dLon, lat0 + dLat],
    [lon0,        lat0 + dLat],
    [lon0,        lat0       ]
  ]]);
}

/* ============================================================
   メッシュ Polygon を作る
   1. VectorGrid の geometry があればそれを使う
   2. 無ければ meshcode から復元する
   ============================================================ */
function getMeshPolygon(e) {
  const feat = e.layer._vectorTileFeature;

  if (feat && feat.geometry && feat.geometry[0]) {
    const coords = feat.geometry[0];
    return turf.polygon([coords]);
  }

  const props = e.layer.properties || {};
  const meshcode = props.meshcode || props.MESH20 || props.MESH_ID;

  if (!meshcode) {
    console.warn("メッシュコードが見つからず、Polygon を生成できませんでした", props);
    return null;
  }

  const poly = getMeshPolygonFromMeshcode(meshcode);
  if (!poly) {
    console.warn("meshcode から Polygon を生成できませんでした", meshcode);
  }
  return poly;
}

/* ============================================================
   VectorGrid 空間結合（樹種2024・判読図）
   ※ layerName は PBF の source-layer 名に合わせて要調整
   ============================================================ */
async function getVectorGridJoin(vgLayer, layerName, meshPoly) {
  const z = map.getZoom();
  const bbox = turf.bbox(meshPoly);
  const centerLng = (bbox[0] + bbox[2]) / 2;
  const centerLat = (bbox[1] + bbox[3]) / 2;

  const p = map.project([centerLat, centerLng], z).divideBy(256).floor();
  const coords = { z, x: p.x, y: p.y };

  if (!vgLayer._getVectorTilePromise) {
    console.warn("VectorGrid に _getVectorTilePromise がありません");
    return null;
  }

  const tile = await vgLayer._getVectorTilePromise(coords);
  if (!tile || !tile.layers || !tile.layers[layerName]) return null;

  const features = tile.layers[layerName].features || [];

  for (const f of features) {
    if (!f.geometry || !f.geometry[0]) continue;
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
    const bbox = turf.bbox(meshPoly);
    const z = map.getZoom();

    const pixels = [];

    const nw = map.project([bbox[3], bbox[0]], z).divideBy(256).floor();
    const se = map.project([bbox[1], bbox[2]], z).divideBy(256).floor();

    let pending = 0;
    let started = false;

    for (let x = nw.x; x <= se.x; x++) {
      for (let y = se.y; y <= nw.y; y++) {
        pending++;
        started = true;

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

              // TerrainRGB → 樹高（m）
              const h = (R * 256 * 256 + G * 256 + B) * 0.1 - 10000;

              const latlng = map.unproject(
                L.point(x * 256 + px, y * 256 + py),
                z
              );

              const pt = turf.point([latlng.lng, latlng.lat]);
              if (turf.booleanPointInPolygon(pt, meshPoly)) {
                pixels.push(h);
              }
            }
          }

          if (--pending === 0 && started) resolve(pixels);
        };

        img.onerror = () => {
          if (--pending === 0 && started) resolve(pixels);
        };
      }
    }

    if (!started) resolve(pixels);
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
    return { avg: "" }; // 無立木地 → 空欄
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
    fillOpacity: 0.05
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
  const meshProps = e.layer.properties || {};
  const meshPoly = getMeshPolygon(e);

  if (!meshPoly) {
    showMeshAttributesWithJoin(meshProps, {});
    return;
  }

  // ★ ここは実際の PBF の source-layer 名に合わせて調整
  const treesp  = typeof layerTREESP2024 !== "undefined"
    ? await getVectorGridJoin(layerTREESP2024, "treespecies", meshPoly)
    : null;

  const handoku = typeof layerHANDOKU !== "undefined"
    ? await getVectorGridJoin(layerHANDOKU, "handoku", meshPoly)
    : null;

  const dchm  = typeof layerDCHMPNG   !== "undefined" ? await getDCHMStats(meshPoly) : { avg: "" };
  const henka = typeof layerhenkaTRGB !== "undefined" ? await getHenkaMax(meshPoly)  : { max: "" };

  const joinProps = {
    "樹種2024": treesp ? (treespp?.樹種名 ?? JSON.stringify(treesp)) : "",
    "平均樹高(DCHM)": dchm.avg,
    "地形変化量 最大値": henka.max,
    "判読図": handoku ? (handoku?.分類 ?? JSON.stringify(handoku)) : ""
  };

  showMeshAttributesWithJoin(meshProps, joinProps);
});
