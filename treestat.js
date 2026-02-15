/* ============================================================
   立木統計計算：中心点が含まれる mesh20 内の立木を集計
   ============================================================ */
console.log("areaIndexLayer =", areaIndexLayer);

// ▼ 統計結果を表示する HTML 要素（既存の属性パネル）
const infoBox = document.getElementById("attrContent");

// ▼ mesh20（判定用）を保持
let mesh20IndexLayer = null;

// mesh20 読み込み（判定用）
fetch("data/mesh20.geojson")
  .then(res => res.json())
  .then(json => {
    mesh20IndexLayer = L.geoJSON(json, {
      style: { color: "#000", weight: 0, fillOpacity: 0 }
    });
  });

/* ===== 中心点移動時に統計を更新 ===== */
map.on("moveend", () => {
  if (!mesh20IndexLayer) return;

  const c = map.getCenter();
  const pt = turf.point([c.lng, c.lat]);

  let targetMesh = null;

  // ▼ 中心点を含むメッシュを特定
  mesh20IndexLayer.eachLayer(layer => {
    const feature = layer.feature;
    if (turf.booleanPointInPolygon(pt, feature)) {
      targetMesh = feature;
    }
  });

  if (!targetMesh) {
    infoBox.innerHTML = "メッシュ外です。";
    return;
  }

  const meshID = targetMesh.properties.id;

  /* ============================================================
     ★ ① メッシュ内部の TLS ポリゴン面積（㎡）を計算
     ============================================================ */

  let tlsArea = 0; // m2

  if (areaIndexLayer) {
    areaIndexLayer.eachLayer(layer => {
      const poly = layer.feature;

      // メッシュと TLS ポリゴンの交差部分を計算
      const intersect = turf.intersect(targetMesh, poly);

      if (intersect) {
        tlsArea += turf.area(intersect); // m2
      }
    });
  }

  if (tlsArea === 0) {
    infoBox.innerHTML = `
      メッシュ番号：${meshID}<br>
      調査地（TLS）外です。
    `;
    return;
  }

  /* ============================================================
     ② メッシュ内の立木を抽出（★白枠マーカー除外）
     ============================================================ */

  const trees = [];

  layerCSV.eachLayer(marker => {

    // ★ 100年木の白枠マーカー（treeDataなし）を除外
    if (!marker.treeData) return;

    const latlng = marker.getLatLng();
    const p = turf.point([latlng.lng, latlng.lat]);

    if (turf.booleanPointInPolygon(p, targetMesh)) {

      const td = marker.treeData;

      // ★ 数値変換を徹底（NaN も防ぐ）
      const safeTree = {
        id: td.id,
        Species: td.Species,
        Comment: td.Comment || "",
        DBH: Number(td.DBH) || 0,
        Height: Number(td.Height) || 0,
        Volume: Number(td.Volume) || 0,
        Cut: Number(td.Cut) || 0,
        lon: Number(td.lon) || 0,
        lat: Number(td.lat) || 0,
        area: td.area || null
      };

      trees.push(safeTree);
    }
  });

  if (trees.length === 0) {
    infoBox.innerHTML = `
      メッシュ番号：${meshID}<br>
      TLS面積：${tlsArea.toFixed(1)} ㎡<br>
      立木なし
    `;
    return;
  }

  /* ===== 統計計算（すべて数値なので安全） ===== */

  const count = trees.length;

  // ★ 立木密度（本/ha）
  const density = count / (tlsArea / 10000);

  // 樹種構成
  const speciesCount = {};
  trees.forEach(t => {
    speciesCount[t.Species] = (speciesCount[t.Species] || 0) + 1;
  });

  const speciesRatio = Object.entries(speciesCount)
    .map(([sp, n]) => `${sp}: ${(n / count * 100).toFixed(1)}%`)
    .join(", ");

  // 平均樹高
  const avgH = trees.reduce((s, t) => s + t.Height, 0) / count;

  // 平均 DBH
  const avgDBH = trees.reduce((s, t) => s + t.DBH, 0) / count;

  // 胸高断面積合計
  const Gsum = trees.reduce((s, t) => {
    const r = t.DBH / 200;
    return s + Math.PI * r * r;
  }, 0);

  // 1ha換算
  const Gha = (Gsum / tlsArea) * 10000;

  // 材積合計
  const Vsum = trees.reduce((s, t) => s + t.Volume, 0);

  // 1ha換算
  const Vha = (Vsum / tlsArea) * 10000;

  // 形状比
  const shape = trees.reduce((s, t) => s + (t.Height / t.DBH), 0) / count;

  // 相対幹距比
  const distances = [];

  for (let i = 0; i < trees.length; i++) {
    let minDist = Infinity;

    for (let j = 0; j < trees.length; j++) {
      if (i === j) continue;

      const d = turf.distance(
        turf.point([trees[i].lon, trees[i].lat]),
        turf.point([trees[j].lon, trees[j].lat]),
        { units: "meters" }
      );

      if (d < minDist) minDist = d;
    }

    distances.push(minDist);
  }

  const avgSpacing = distances.reduce((s, d) => s + d, 0) / distances.length;
  const RBR = (avgSpacing / avgH) * 100;

  // 伐採木
  const cutTrees = trees.filter(t => t.Cut === 1);

  let cutInfo = "";
  if (cutTrees.length > 0) {
    const cutCount = cutTrees.length;
    const cutRate = (cutCount / count * 100).toFixed(1);

    const Gcut = cutTrees.reduce((s, t) => {
      const r = t.DBH / 200;
      return s + Math.PI * r * r;
    }, 0);
    const GcutRate = (Gcut / Gsum * 100).toFixed(1);

    const Vcut = cutTrees.reduce((s, t) => s + t.Volume, 0);
    const VcutRate = (Vcut / Vsum * 100).toFixed(1);

    cutInfo = `
      <br><b>伐採情報</b><br>
      本数伐採率：${cutRate}%<br>
      胸高断面積伐採率：${GcutRate}%<br>
      材積伐採率：${VcutRate}%<br>
    `;
  }

  /* ===== サイドバーに表示 ===== */
  infoBox.innerHTML = `
    <h3>立木情報</h3>
    メッシュ番号：${meshID}<br>
    TLS面積：${tlsArea.toFixed(1)} ㎡<br>
    本数：${count} 本<br>
    立木密度：${density.toFixed(1)} 本/ha<br>
    樹種構成：${speciesRatio}<br>
    平均樹高：${avgH.toFixed(1)} m<br>
    平均DBH：${avgDBH.toFixed(1)} cm<br>
    胸高断面積合計：${Gha.toFixed(2)} ㎡/ha<br>
    材積合計：${Vha.toFixed(2)} ㎥/ha<br>
    形状比平均：${shape.toFixed(2)}<br>
    相対幹距比：${RBR.toFixed(1)} %<br>
    ${cutInfo}
  `;
  injectExportButtons();

  // ★ drawtree.js へ安全な数値データを送る
  document.dispatchEvent(new CustomEvent("meshTreeStatsReady", {
    detail: { targetMesh, trees }
  }));
});
