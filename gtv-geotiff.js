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
        resolve(0.5);
      }

      if (key === "s") {
        window.removeEventListener("keydown", handler);
        resolve(0.25);
      }
    };

    window.addEventListener("keydown", handler);
  });
}

/* ----------------------------------------
   1. GeoTIFF 情報表示
---------------------------------------- */
function showTiffInfo(georaster, file) {
  document.getElementById("tiffInfo").style.display = "block";
  const info = document.getElementById("tiffInfoBody");

  const width = georaster.width;
  const height = georaster.height;

  const gsdX = georaster.pixelWidth;
  const gsdCm = (gsdX * 100).toFixed(1);

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
const THRESHOLD_1 = 150 * 1024 * 1024;

/* ----------------------------------------
   2. GeoTIFF 読み込み（縮小ロジック統合）
---------------------------------------- */
async function loadGeoTIFF(arrayBuffer, file, scale = 1) {
  updateDetail("GeoTIFF を解析中…");

  const georaster = await parseGeoraster(arrayBuffer, {
    buildPyramid: false
  });

  showTiffInfo(georaster, file);

  if (scale === 1) {
    updateDetail("地図に描画しています…");
    return renderGeoTIFF(georaster);
  }

  updateDetail("縮小版を生成中…");

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
    if (y % 100 === 0) {
      const percent = Math.floor((y / height) * 100);
      updateDetail(`縮小処理中… ${percent}%`);
      await new Promise(r => setTimeout(r));
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

  updateDetail("地図に描画しています…");
  return renderGeoTIFF(lowresGeoraster);
}

/* ----------------------------------------
   3. GeoTIFF レイヤ描画
---------------------------------------- */
function renderGeoTIFF(georaster) {
  if (currentLayer) map.removeLayer(currentLayer);

  const noData = georaster.noDataValue || georaster.metadata?.NODATA || 0;

  currentLayer = new GeoRasterLayer({
    georaster,
    opacity: 0.8,
    resolution: 128,
    noDataValue: noData,
    pane: "geotiffPane"
  });

  currentLayer.addTo(map);
  map.fitBounds(currentLayer.getBounds());

  updateDetail("完了！");
  hideLoading();
}

/* ----------------------------------------
   4. TIFF 専用処理
---------------------------------------- */
async function handleTiffFile(file) {
  showLoading("GeoTIFF を読み込んでいます…");

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
}

/* ----------------------------------------
   5. ファイル種別判定（統合 handleFile）
---------------------------------------- */
async function handleFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".tif") || name.endsWith(".tiff")) {
    return handleTiffFile(file);
  }

  return handleVectorFile(file);
}

/* ----------------------------------------
   6. ファイル選択
---------------------------------------- */
document.getElementById("fileInput").addEventListener("change", async (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    await handleFile(file);
  }

  event.target.value = "";
});

/* ----------------------------------------
   7. ドラッグ＆ドロップ
---------------------------------------- */
const dropzone = document.getElementById("dropzone");

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");

  const files = e.dataTransfer.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    await handleFile(file);
  }
});
