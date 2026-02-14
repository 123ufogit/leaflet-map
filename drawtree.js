/* ============================================================
   drawtree.js — 樹高プロファイル（三角形）描画モジュール（最新版）
   ============================================================ */

// グラフインスタンス（再描画時に破棄するため）
let heightChart = null;

/* ============================================================
   treeplot.js と同じ樹種カラー
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
   Chart.js プラグイン（三角形描画）
   ============================================================ */
const trianglePlugin = {
  id: "triangleTrees",
  afterDatasetsDraw(chart, args, options) {
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);

    const trees = dataset.raw;

    // ▼ 南北方向（lat）の正規化用 min/max
    const lats = trees.map(t => t.lat);
    const latMin = Math.min(...lats);
    const latMax = Math.max(...lats);

    dataset.raw.forEach((t, index) => {
      const color = getSpeciesColor(t.Species);

      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      const xPixel = meta.data[index].x;

      // ▼ 樹高 → Y ピクセル
      const apexY = yScale.getPixelForValue(t.Height);

      // ▼ DBH を 20m メッシュ幅で割って正規化
      const dbh_m = dbhToMeters(t.DBH) / 20;
      const halfBasePx =
        (dbh_m / (xScale.max - xScale.min)) * xScale.width / 2;

      const leftX = xPixel - halfBasePx;
      const rightX = xPixel + halfBasePx;
      const baseY = yScale.getPixelForValue(0);

      // ▼ 南北方向の正規化（0〜1）
      const normY = (t.lat - latMin) / (latMax - latMin);

      // ▼ 塗りつぶし透明度（0=0.6, 1=0.2）
      const alpha = 0.6 - 0.4 * normY;

      ctx.beginPath();
      ctx.moveTo(xPixel, apexY);
      ctx.lineTo(leftX, baseY);
      ctx.lineTo(rightX, baseY);
      ctx.closePath();

      // ▼ 伐採木 → 塗りつぶしなし、枠線点線
      if (t.Cut === 1) {
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.setLineDash([4, 3]);
      } else {
        ctx.fillStyle = hexToRgba(color, alpha);
        ctx.setLineDash([]); // 実線
      }
      ctx.fill();

      // ▼ コメントあり → 将来木（枠線太く）
      const isFutureTree = (t.Comment && t.Comment.trim() !== "");

      ctx.strokeStyle = color;
      ctx.lineWidth = isFutureTree ? 3 : 1;
      ctx.stroke();
    });
  }
};

/* ============================================================
   メッシュ内の立木データから三角形プロファイルを描画
   ============================================================ */
function drawTreeHeightScatter(targetMesh, trees) {
  if (!targetMesh || trees.length === 0) return;

  // ▼ メッシュの bbox（西端・東端）を取得
  const bbox = turf.bbox(targetMesh);
  const west = bbox[0];
  const east = bbox[2];

  // ▼ 散布図データ作成（正規化 X）
  const scatterData = trees.map(t => {
    const normX = (t.lon - west) / (east - west);
    return { x: normX, y: t.Height };
  });

  // ▼ attrContent に canvas を追加
  const infoBox = document.getElementById("attrContent");

  infoBox.innerHTML += `
    <h3>樹高プロファイル（三角形）</h3>
    <canvas id="heightScatter" width="300" height="200"></canvas>
  `;

  const ctx = document.getElementById("heightScatter");

  // ▼ 既存グラフがあれば破棄
  if (heightChart) {
    heightChart.destroy();
  }

  // ▼ Chart.js 初期化（点を消す・縦軸0固定）
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
        x: {
          min: 0,
          max: 1,
          title: { display: true, text: "正規化 X (0=西端, 1=東端)" }
        },
        y: {
          min: 0,
          title: { display: true, text: "樹高 (m)" }
        }
      }
    },
    plugins: [trianglePlugin]
  });
}

/* ============================================================
   treestat.js → drawtree.js へのイベント受信
   ============================================================ */
document.addEventListener("meshTreeStatsReady", (e) => {
  const { targetMesh, trees } = e.detail;
  drawTreeHeightScatter(targetMesh, trees);
});

/* ============================================================
   Chart.js プラグイン（三角形描画：縦断面）
   ============================================================ */
const trianglePluginVertical = {
  id: "triangleTreesVertical",
  afterDatasetsDraw(chart, args, options) {
    const ctx = chart.ctx;
    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);

    const trees = dataset.raw;

    // ▼ 東西方向（lon）の min/max（透明度用）
    const lons = trees.map(t => t.lon);
    const lonMin = Math.min(...lons);
    const lonMax = Math.max(...lons);

    dataset.raw.forEach((t, index) => {
      const color = getSpeciesColor(t.Species);

      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      const xPixel = meta.data[index].x;

      // ▼ 樹高 → Y ピクセル
      const apexY = yScale.getPixelForValue(t.Height);

      // ▼ DBH → 三角形幅（横断面と同じロジック）
      const dbh_m = dbhToMeters(t.DBH) / 20;
      const halfBasePx =
        (dbh_m / (xScale.max - xScale.min)) * xScale.width / 2;

      const leftX = xPixel - halfBasePx;
      const rightX = xPixel + halfBasePx;
      const baseY = yScale.getPixelForValue(0);

      // ▼ 東西方向の正規化（透明度用）
      const normEW = (t.lon - lonMin) / (lonMax - lonMin);

      // ▼ 透明度（西=濃い、東=薄い）
      const alpha = 0.6 - 0.4 * normEW;

      ctx.beginPath();
      ctx.moveTo(xPixel, apexY);
      ctx.lineTo(leftX, baseY);
      ctx.lineTo(rightX, baseY);
      ctx.closePath();

      // ▼ 伐採木 → 塗りつぶしなし、点線
      if (t.Cut === 1) {
        ctx.fillStyle = "rgba(0,0,0,0)";
        ctx.setLineDash([4, 3]);
      } else {
        ctx.fillStyle = hexToRgba(color, alpha);
        ctx.setLineDash([]);
      }
      ctx.fill();

      // ▼ コメントあり → 将来木（枠線太く）
      const isFutureTree = (t.Comment && t.Comment.trim() !== "");
      ctx.strokeStyle = color;
      ctx.lineWidth = isFutureTree ? 3 : 1;
      ctx.stroke();
    });
  }
};

/* ============================================================
   メッシュ内の立木データから縦断面プロファイルを描画
   ============================================================ */
function drawTreeHeightScatterVertical(targetMesh, trees) {
  if (!targetMesh || trees.length === 0) return;

  // ▼ メッシュの bbox（南端・北端）を取得
  const bbox = turf.bbox(targetMesh);
  const south = bbox[1];
  const north = bbox[3];

  // ▼ 散布図データ作成（南北方向の正規化）
  const scatterData = trees.map(t => {
    const normX = (t.lat - north) / (south - north); // 北=0、南=1
    return { x: normX, y: t.Height };
  });

  // ▼ attrContent に canvas を追加
  const infoBox = document.getElementById("attrContent");

  infoBox.innerHTML += `
    <h3>樹高プロファイル（縦断面：南北）</h3>
    <canvas id="heightScatterVertical" width="300" height="200"></canvas>
  `;

  const ctx = document.getElementById("heightScatterVertical");

  // ▼ 既存グラフがあれば破棄
  if (window.heightChartVertical) {
    window.heightChartVertical.destroy();
  }

  // ▼ Chart.js 初期化
  window.heightChartVertical = new Chart(ctx, {
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
        x: {
          min: 0,
          max: 1,
          title: { display: true, text: "正規化 Y (0=北端, 1=南端)" }
        },
        y: {
          min: 0,
          title: { display: true, text: "樹高 (m)" }
        }
      }
    },
    plugins: [trianglePluginVertical]
  });
}
injectExportButtons();
