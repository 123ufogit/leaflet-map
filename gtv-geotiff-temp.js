/* ----------------------------------------
   0. ローディング表示
---------------------------------------- */
function showLoading(text) {
  document.getElementById("loadingText").textContent = text;
  document.getElementById("loadingOverlay").style.display = "flex";
}

function updateDetail(text) {
  document.getElementById("loadingDetail").textContent = text;
}

function hideLoading() {
  document.getElementById("loadingOverlay").style.display = "none";
}

/* ----------------------------------------
   S/L キー入力で縮小率を選択
---------------------------------------- */
function askScaleKey() {
  return new Promise((resolve) => {
    const handler = (e) => {
      const key = e.key.toLowerCase();

      if (key === "l") {
        window.removeEventListener("keydown", handler);
        resolve(0.5);   // Large = 1/2
      }

      if (key === "s") {
        window.removeEventListener("keydown", handler);
        resolve(0.25);  // Small = 1/4
      }
    };

    window.addEventListener("keydown", handler);
  });
}

/* ----------------------------------------
   3. GeoTIFF 読み込み（縮小ロジック統合）
---------------------------------------- */
function showTiffInfo(georaster, file) {
  document.getElementById("tiffInfo").style.display = "block";
  const info = document.getElementById("tiffInfoBody");

  const width = georaster.width;
  const height = georaster.height;

  const gsdX = georaster.pixelWidth;   // m/pixel
  const gsdY = georaster.pixelHeight;

  // cm/pixel に変換（例：0.03m → 3cm）
  const gsdCm = (gsdX * 100).toFixed(1);

  // 作成日（存在しない場合もある）
const date = georaster.metadata?.DateTime;
const dateHtml = date ? `<div>作成日：${date}</div>` : "";

  info.innerHTML = `
    ${dateHtml}
    <div>ファイルタイプ：GeoTIFF</div>
    <div>ピクセルサイズ：${width} × ${height}px</div>
    <div>地上解像度：${gsdCm}cm/px</div>
  `;
}

let currentLayer = null;

// 閾値（MB） 50MB → S/L 選択開始
const THRESHOLD_1 = 150 * 1024 * 1024;

async function loadGeoTIFF(arrayBuffer, file, scale = 1) {
  document.getElementById("loadingText").textContent = "解析中…";
  updateDetail("");

  const georaster = await parseGeoraster(arrayBuffer, {
    buildPyramid: false
  });

showTiffInfo(georaster, file);
   
  // 縮小不要ならそのまま
  if (scale === 1) {
    return renderGeoTIFF(georaster);
  }

  // 縮小処理
  document.getElementById("loadingText").textContent = "縮小版を生成中…";

  const width = georaster.width;
  const height = georaster.height;

  const newW = Math.floor(width * scale);
  const newH = Math.floor(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const imageData = ctx.createImageData(width, height);
const data = imageData.data;
const raster = georaster.values;
const isRGB = raster.length >= 3;

for (let y = 0; y < height; y++) {

  // 進捗を UI に反映（100 行ごと）
  if (y % 100 === 0) {
    const percent = Math.floor((y / height) * 100);
    updateDetail(`縮小処理中… ${percent}%`);
    await new Promise(r => setTimeout(r));  // UI に制御を返す
  }

  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (isRGB) {
      data[i] = raster[0][y][x];
      data[i + 1] = raster[1][y][x];
      data[i + 2] = raster[2][y][x];
      data[i + 3] = 255;
    } else {
      const v = raster[0][y][x];
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
}


  ctx.putImageData(imageData, 0, 0);

  const smallCanvas = document.createElement("canvas");
  smallCanvas.width = newW;
  smallCanvas.height = newH;
  const smallCtx = smallCanvas.getContext("2d");

  smallCtx.drawImage(canvas, 0, 0, newW, newH);

  const smallImageData = smallCtx.getImageData(0, 0, newW, newH);
  const smallRaster = [[], [], []];

  for (let y = 0; y < newH; y++) {
    smallRaster[0][y] = [];
    smallRaster[1][y] = [];
    smallRaster[2][y] = [];
    for (let x = 0; x < newW; x++) {
      const i = (y * newW + x) * 4;
      smallRaster[0][y][x] = smallImageData.data[i];
      smallRaster[1][y][x] = smallImageData.data[i + 1];
      smallRaster[2][y][x] = smallImageData.data[i + 2];
    }
  }

  const lowresGeoraster = {
    ...georaster,
    width: newW,
    height: newH,
    values: smallRaster
  };

  return renderGeoTIFF(lowresGeoraster);
}

/* ----------------------------------------
   GeoTIFF レイヤ描画（共通）
---------------------------------------- */
function renderGeoTIFF(georaster) {
  if (currentLayer) map.removeLayer(currentLayer);

  currentLayer = new GeoRasterLayer({
    georaster,
    opacity: 0.8,
    resolution: 128,
    updateWhenZooming: true,
    updateInterval: 0,
    keepBuffer: 5,
    pane: "geotiffPane"
  });

  currentLayer.addTo(map);
  map.fitBounds(currentLayer.getBounds());

  hideLoading();
}

/* ----------------------------------------
   4. ファイル種別判定（S/L 選択統合）
---------------------------------------- */
async function handleFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".tif") || name.endsWith(".tiff")) {
    showLoading("読み込み中…");

    const reader = new FileReader();

    reader.onloadstart = () => {
      const totalMB = (file.size / 1024 / 1024).toFixed(1);
      updateDetail(`0MB / ${totalMB}MB`);
    };

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const loadedMB = (e.loaded / 1024 / 1024).toFixed(1);
        const totalMB = (e.total / 1024 / 1024).toFixed(1);
        updateDetail(`${loadedMB}MB / ${totalMB}MB`);
      }
    };

    reader.onload = async () => {
      let scale = 1;

      if (file.size > THRESHOLD_1) {
        document.getElementById("loadingText").textContent =
          "縮小率を選択してください（L=1/2 大きい, S=1/4 小さい）";
        updateDetail("キーボードで L または S を押してください");

        scale = await askScaleKey();
      }

      await loadGeoTIFF(reader.result, file, scale);
    };

    reader.readAsArrayBuffer(file);
    return;
  }
}

