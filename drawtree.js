/* ============================================================
   drawtree.js — 樹高プロファイル（三角形）描画モジュール
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

    dataset.raw.forEach((t, index) => {
      const color = getSpeciesColor(t.Species);

      const xScale = chart.scales.x;
      const yScale = chart.scales.y;

      const xPixel = meta.data[index].x;
      const yPixel = meta.data[index].y;

      const dbh_m = dbhToMeters(t.DBH);
      const halfBasePx =
        (dbh_m / (xScale.max - xScale.min)) * xScale.width / 2;

      const apexX = xPixel;
      const apexY = yScale.getPixelForValue(t.Height);

      const leftX = xPixel - halfBasePx;
      const leftY = yScale.getPixelForValue(0);

      const rightX = xPixel + halfBasePx;
      const rightY = yScale.getPixelForValue(0);

      ctx.beginPath();
      ctx.moveTo(apexX, apexY);
      ctx.lineTo(leftX, leftY);
      ctx.lineTo(rightX, rightY);
      ctx.closePath();

      // 伐採木 → 塗りつぶしなし
      if (t.Cut === 1) {
        ctx.fillStyle = "rgba(0,0,0,0)";
      } else {
        ctx.fillStyle = hexToRgba(color, 0.5);
      }
      ctx.fill();

      // コメントあり → 将来木（枠線太く）
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

  // 既存内容を壊さず追加
  infoBox.innerHTML += `
    <h3>樹高プロファイル（三角形）</h3>
    <canvas id="heightScatter" width="300" height="200"></canvas>
  `;

  const ctx = document.getElementById("heightScatter");

  // ▼ 既存グラフがあれば破棄
  if (heightChart) {
    heightChart.destroy();
  }

  // ▼ Chart.js 初期化（plugin 登録）
  heightChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [{
        label: "樹高",
        data: scatterData,
        raw: trees
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
