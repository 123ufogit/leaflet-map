/* ============================================================
   drawtree.js — 樹高プロファイル（三角形）描画モジュール（完全安定版）
   ============================================================ */

// グラフインスタンス
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
   コメント正規化 → 将来木判定
   ============================================================ */
function isFutureTreeByComment(commentRaw) {
  const comment = String(commentRaw || "").trim();

  const normalized = comment.replace(/[０-９]/g, s =>
    String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  );

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

      if (t.Cut === 1) {
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.setLineDash([4, 3]);
      } else {
        ctx.fillStyle = hexToRgba(color, alpha);
        ctx.setLineDash([]);
      }
      ctx.fill();

      const future = isFutureTreeByComment(t.Comment);

      ctx.strokeStyle = color;
      ctx.lineWidth = future ? 3 : 1;
      ctx.stroke();
    });
  }
};

/* ============================================================
   横断面プロファイル描画（innerHTML 排除）
   ============================================================ */
function drawTreeHeightScatter(targetMesh, trees) {
  if (!targetMesh || trees.length === 0) return;

  const infoBox = document.getElementById("attrContent");

  const oldCanvas = document.getElementById("heightScatter");
  if (oldCanvas) oldCanvas.remove();

  const oldTitle = document.getElementById("heightScatterTitle");
  if (oldTitle) oldTitle.remove();

  const title = document.createElement("h3");
  title.id = "heightScatterTitle";
  title.textContent = "樹高プロファイル（三角形：東西）";
  infoBox.appendChild(title);

  const canvas = document.createElement("canvas");
  canvas.id = "heightScatter";
  canvas.width = 300;
  canvas.height = 133;
  infoBox.appendChild(canvas);

  const bbox = turf.bbox(targetMesh);
  const west = bbox[0];
  const east = bbox[2];

  const scatterData = trees.map(t => ({
    x: (t.lon - west) / (east - west),
    y: t.Height
  }));

  if (heightChart) heightChart.destroy();

  heightChart = new Chart(canvas, {
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

      const future = isFutureTreeByComment(t.Comment);

      ctx.strokeStyle = color;
      ctx.lineWidth = future ? 3 : 1;
      ctx.stroke();
    });
  }
};

/* ============================================================
   縦断面プロファイル描画（innerHTML 排除）
   ============================================================ */
function drawTreeHeightScatterVertical(targetMesh, trees) {
  if (!targetMesh || trees.length === 0) return;

  const infoBox = document.getElementById("attrContent");

  const oldCanvas = document.getElementById("heightScatterVertical");
  if (oldCanvas) oldCanvas.remove();

  const oldTitle = document.getElementById("heightScatterVerticalTitle");
  if (oldTitle) oldTitle.remove();

  const title = document.createElement("h3");
  title.id = "heightScatterVerticalTitle";
  title.textContent = "樹高プロファイル（縦断面：南北）";
  infoBox.appendChild(title);

  const canvas = document.createElement("canvas");
  canvas.id = "heightScatterVertical";
  canvas.width = 300;
  canvas.height = 133;
  infoBox.appendChild(canvas);

  const bbox = turf.bbox(targetMesh);
  const south = bbox[1];
  const north = bbox[3];

  const scatterData = trees.map(t => ({
    x: (t.lat - south) / (north - south),
    y: t.Height
  }));

  if (heightChartVertical) heightChartVertical.destroy();

  heightChartVertical = new Chart(canvas, {
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
