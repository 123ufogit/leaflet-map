/* ============================================================
   drawtree.js
   メッシュ内の立木データを使ってグラフを描画するモジュール
   - X座標を0〜1に正規化
   - 樹高（Height）をY軸にした散布図を描画
   - Chart.js を使用
   ============================================================ */

// グラフインスタンス（再描画時に破棄するため）
let heightChart = null;

/**
 * メッシュ内の立木データから散布図を描画する
 * @param {Object} targetMesh - turf polygon（20m mesh）
 * @param {Array} trees - メッシュ内の treeCSV データ（treeData）
 */
function drawTreeHeightScatter(targetMesh, trees) {

  // ▼ メッシュが無い or 立木が無い場合は終了
  if (!targetMesh || trees.length === 0) return;

  // ▼ メッシュの bbox（西端・東端）を取得
  const bbox = turf.bbox(targetMesh);
  const west = bbox[0];   // xmin
  const east = bbox[2];   // xmax

  // ▼ 散布図データ作成（メッシュ内の tree のみ）
  const scatterData = trees.map(t => {
    const normX = (t.lon - west) / (east - west);  // 0〜1に正規化
    return { x: normX, y: t.Height };
  });

  // ▼ attrContent に canvas を追加（既存HTMLを壊さない）
  const infoBox = document.getElementById("attrContent");

  // 既存の内容の下にグラフ領域を追加
  infoBox.innerHTML += `
    <h3>樹高プロファイル（X正規化）</h3>
    <canvas id="heightScatter" width="300" height="200"></canvas>
  `;

  const ctx = document.getElementById("heightScatter");

  // ▼ 既存グラフがあれば破棄
  if (heightChart) {
    heightChart.destroy();
  }

  // ▼ Chart.js 散布図を描画
  heightChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [{
        label: "樹高",
        data: scatterData,
        pointRadius: 4,
        backgroundColor: "rgba(54, 162, 235, 0.8)"
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
    }
  });
}

document.addEventListener("meshTreeStatsReady", (e) => {
  const { targetMesh, trees } = e.detail;
  drawTreeHeightScatter(targetMesh, trees);
});

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("meshTreeStatsReady", (e) => {
    const { targetMesh, trees } = e.detail;
    drawTreeHeightScatter(targetMesh, trees);
  });
});
