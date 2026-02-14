/* ============================================================
   drawtree.js — 樹高プロファイル（三角形）描画モジュール（最新版）
   ============================================================ */

// グラフインスタンス（再描画時に破棄するため）
let heightChart = null;
let heightChartVertical = null;

/* ============================================================
   樹種カラー
   ============================================================ */
const speciesColor = {
  "スギ": "#99cc00",
  "アテ": "#66ccff",
  "ヒノキ": "#ff66cc",
  "アカマツ": "#8B4513"
};

function getSpeciesColor(species) {
  return speciesColor[species] || "#cccccc";
}

/* ============================================================
   補助関数
   ============================================================ */
function dbhToMeters(dbh) {
  return dbh / 100;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ============================================================
   コメント正規化 → 将来木判定（共通）
   ============================================================ */
function isFutureTreeByComment(commentRaw) {
  // null / undefined / 空欄を安全に文字列化
  const comment = String(commentRaw || "").trim();

  // 全角数字 → 半角数字
  const normalized = comment.replace(/[０-９]/g, s =>
    String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  );

  // 将来木判定
  return normalized === "将来木" || normalized === "100年木";
}

/* ============================================================
   Chart.js プラグイン（三角形：横断面）
   ============================================================ */
const trianglePlugin = {
  id: "triangleTrees",
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    const trees = dataset.raw;

    const lats = trees.map(t => t.lat);
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);

    trees.forEach((t, index) => {
      const color = getSpeciesColor(t.Species);
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      const xPixel = meta.data[index].x;
      const apexY = yScale.getPixelForValue(t.Height);

      const dbh_m = dbhToMeters(t.DBH) / 20;
      const halfBasePx =
        (dbh_m / (xScale.max - xScale.min)) * xScale.width / 2;

      const leftX = xPixel - halfBasePx;
      const rightX = xPixel + halfBasePx;
      const baseY = yScale.getPixelForValue(0);

      const normY = (t.lat - latMin) / (latMax - latMin);
      const alpha = 0.6 - 0.4 * normY;

      ctx.beginPath();
      ctx.moveTo(xPixel, apexY);
      ctx.lineTo(leftX, baseY);
      ctx.lineTo(rightX, baseY);
      ctx.closePath();

      // 伐採木 → 塗りつぶしなし・点線
      if (t.Cut === 1) {
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.setLineDash([4, 3]);
      } else {
        ctx.fillStyle = hexToRgba(color, alpha);
        ctx.setLineDash([]);
      }
      ctx.fill();

      // 将来木判定
      const future = isFutureTreeByComment(t.Comment);

      ctx.strokeStyle = color;
      ctx.lineWidth = future ? 3 : 1;
      ctx.stroke();
    });
  }
};

/* ============================================================
   横断面プロファイル描画
   ============================================================ */
function drawTreeHeightScatter(targetMesh, trees) {
  if (!targetMesh || trees.length === 0) return;

  // 古い canvas を削除
  const oldCanvas = document.getElementById("heightScatter");
  if (oldCanvas) oldCanvas.remove();

  const bbox = turf.bbox(targetMesh);
  const west = bbox[0];
  const east = bbox[2];

  const scatterData = trees.map(t => ({
    x: (t.lon - west) / (east - west),
    y: t.Height
  }));

  const infoBox = document.getElementById("attrContent");

  infoBox.innerHTML += `
    <h3>樹高プロファイル（三角形）</h3>
    <canvas id="heightScatter" width="300" height="150"></canvas>
  `;

  const ctx = document.getElementById("heightScatter");

  if (heightChart) heightChart.destroy();

  heightChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [{
        label: "樹高",
        data: scatterData,
        raw: trees,
        pointRadius: 0,
        pointHoverRadius: 0
      }]
    },
    options: {
      scales: {
        x: { min: 0, max: 1 },
        y: { min: 0 }
      }
    },
    plugins: [trianglePlugin]
  });
}

/* ============================================================
   縦断面（三角形）プラグイン
   ============================================================ */
const trianglePluginVertical = {
  id: "triangleTreesVertical",
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    const trees = dataset.raw;

    const lons = trees.map(t => t.lon);
    const lonMin = Math.min(...lons);
    const lonMax = Math.max(...lons);

    trees.forEach((t, index) => {
      const color = getSpeciesColor(t.Species);
      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      const xPixel = meta.data[index].x;
      const apexY = yScale.getPixelForValue(t.Height);

      const dbh_m = dbhToMeters(t.DBH) / 20;
      const halfBasePx =
        (dbh_m / (xScale.max - xScale.min)) * xScale.width / 2;

      const leftX = xPixel - halfBasePx;
      const rightX = xPixel + halfBasePx;
      const baseY = yScale.getPixelForValue(0);

      const normEW = (t.lon - lonMin) / (lonMax - lonMin);
      const alpha = 0.6 - 0.4 * normEW;

      ctx.beginPath();
      ctx.moveTo(xPixel, apexY);
      ctx.lineTo(leftX, baseY);
      ctx.lineTo(rightX, baseY);
      ctx.closePath();

      if (t.Cut === 1) {
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.setLineDash([4, 3]);
      } else {
        ctx.fillStyle = hexToRgba(color, alpha);
        ctx.setLineDash([]);
      }
      ctx.fill();

      // 将来木判定
      const future = isFutureTreeByComment(t.Comment);

      ctx.strokeStyle = color;
      ctx.lineWidth = future ? 3 : 1;
      ctx.stroke();
    });
  }
};

/* ============================================================
   縦断面プロファイル描画（南北方向の式を修正済み）
   ============================================================ */
function drawTreeHeightScatterVertical(targetMesh, trees) {
  if (!targetMesh || trees.length === 0) return;

  const oldCanvas = document.getElementById("heightScatterVertical");
  if (oldCanvas) oldCanvas.remove();

  const bbox = turf.bbox(targetMesh);
  const south = bbox[1];
  const north = bbox[3];

  const scatterData = trees.map(t => ({
    x: (t.lat - south) / (north - south),  // ← 修正済み（正しい南北正規化）
    y: t.Height
  }));

  const infoBox = document.getElementById("attrContent");

  infoBox.innerHTML += `
    <h3>樹高プロファイル（縦断面：南北）</h3>
    <canvas id="heightScatterVertical" width="300" height="150"></canvas>
  `;

  const ctx = document.getElementById("heightScatterVertical");

  if (heightChartVertical) heightChartVertical.destroy();

  heightChartVertical = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [{
        label: "樹高（縦断面）",
        data: scatterData,
        raw: trees,
        pointRadius: 0,
        pointHoverRadius: 0
      }]
    },
    options: {
      scales: {
        x: { min: 0, max: 1 },
        y: { min: 0 }
      }
    },
    plugins: [trianglePluginVertical]
  });
}

/* ============================================================
   treestat.js → drawtree.js へのイベント受信
   ============================================================ */
document.addEventListener("meshTreeStatsReady", (e) => {
  const { targetMesh, trees } = e.detail;
  drawTreeHeightScatter(targetMesh, trees);
  drawTreeHeightScatterVertical(targetMesh, trees);
});
