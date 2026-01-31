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
   1. 計測ポップアップ
---------------------------------------- */
function bindMeasurementPopup(layer) {
  let html = "";

  if (layer instanceof L.Polygon && !(layer instanceof L.Rectangle)) {
    const latlngs = layer.getLatLngs();
    let polygons = Array.isArray(latlngs[0][0]) ? latlngs : [latlngs];

    html = "面積<br>";

    polygons.forEach((poly) => {
      const outer = poly[0];
      let areaOuter = L.GeometryUtil.geodesicArea(outer);

      let areaHoles = 0;
      for (let i = 1; i < poly.length; i++) {
        areaHoles += L.GeometryUtil.geodesicArea(poly[i]);
      }

      const area = areaOuter - areaHoles;

      const haRaw = area / 10000;
      const ha = Math.floor(haRaw * 100) / 100;

      const sqm = Math.round(area);

      html +=
        `面積: ${ha.toFixed(2)} ha<br>` +
        `　　 (${sqm.toLocaleString()} m²)<br>`;
    });
  } else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
    const latlngs = layer.getLatLngs();
    let lines = Array.isArray(latlngs[0]) ? latlngs : [latlngs];

    html = "延長<br>";

    lines.forEach((line) => {
      let len = 0;
      for (let i = 0; i < line.length - 1; i++) {
        len += map.distance(line[i], line[i + 1]);
      }
      const km = len / 1000;

      html += `延長: ${len.toFixed(1)} m (${km.toFixed(3)} km)<br>`;
    });
  } else if (layer instanceof L.Marker) {
    const c = layer.getLatLng();
    html =
      `座標<br>` +
      `Lat: ${c.lat.toFixed(6)}<br>` +
      `Lng: ${c.lng.toFixed(6)}`;
  }

  if (!html) return;

  layer.bindPopup(html);
  layer.on("click", () => layer.openPopup());
}

/* ----------------------------------------
   1-1. 属性付与用（GeoJSON フィーチャ）
---------------------------------------- */
function addMeasurementProperties(feature) {
  const geom = feature.geometry;
  if (!geom) return feature;

  feature.properties = feature.properties || {};

  // LineString / MultiLineString → 延長
  if (geom.type === "LineString" || geom.type === "MultiLineString") {
    let total = 0;
    const lines = geom.type === "LineString" ? [geom.coordinates] : geom.coordinates;

    lines.forEach((line) => {
      for (let i = 0; i < line.length - 1; i++) {
        const p1 = L.latLng(line[i][1], line[i][0]);
        const p2 = L.latLng(line[i + 1][1], line[i + 1][0]);
        total += map.distance(p1, p2);
      }
    });

    feature.properties.length_m = Math.round(total);
    feature.properties.length_km = Number(total / 1000).toFixed(3);
  }

  // Polygon / MultiPolygon → 面積
  if (geom.type === "Polygon" || geom.type === "MultiPolygon") {
    const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;

    let totalArea = 0;

    polys.forEach((poly) => {
      const outer = poly[0].map((c) => L.latLng(c[1], c[0]));
      let areaOuter = L.GeometryUtil.geodesicArea(outer);

      let holes = 0;
      for (let i = 1; i < poly.length; i++) {
        const hole = poly[i].map((c) => L.latLng(c[1], c[0]));
        holes += L.GeometryUtil.geodesicArea(hole);
      }

      totalArea += areaOuter - holes;
    });

    feature.properties.area_m2 = Math.round(totalArea);
    feature.properties.area_ha = Number(totalArea / 10000).toFixed(2);
  }

  return feature;
}

function featureToExtendedData(props) {
  if (!props) return "";
  let xml = "<ExtendedData>";
  for (const key in props) {
    const value = props[key];
    xml += `<Data name="${key}"><value>${value}</value></Data>`;
  }
  xml += "</ExtendedData>";
  return xml;
}

/* ----------------------------------------
   2. 描画イベント（Draw）
---------------------------------------- */
map.on(L.Draw.Event.CREATED, (e) => {
  const layer = e.layer;
  layer.options.pane = "vectorPane";
  drawnItems.addLayer(layer);
  bindMeasurementPopup(layer);
});

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
const THRESHOLD_1 = 50 * 1024 * 1024;

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

  if (name.endsWith(".geojson") || name.endsWith(".json")) {
    const text = await file.text();
    const geojson = JSON.parse(text);

    const layer = L.geoJSON(geojson, {
      pane: "vectorPane",
      onEachFeature: (feature, lyr) => {
        drawnItems.addLayer(lyr);
        bindMeasurementPopup(lyr);
      }
    });

    map.fitBounds(layer.getBounds());
    return;
  }

  if (name.endsWith(".kml")) {
    const text = await file.text();
    const parser = new DOMParser();
    const kmlDom = parser.parseFromString(text, "application/xml");

    const geojson = toGeoJSON.kml(kmlDom);

    const layer = L.geoJSON(geojson, {
      pane: "vectorPane",
      onEachFeature: (feature, lyr) => {
        drawnItems.addLayer(lyr);
        bindMeasurementPopup(lyr);
      }
    });

    map.fitBounds(layer.getBounds());
    return;
  }
}

/* ----------------------------------------
   5. ファイル選択
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
   6. ドラッグ＆ドロップ
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

/* ----------------------------------------
   7. GeoJSON / KML 保存（属性付き & 名前を付けて保存）
---------------------------------------- */
async function saveWithPicker(blob, suggestedName, mime, ext) {
  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: ext.toUpperCase(),
          accept: { [mime]: [ext] }
        }
      ]
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  } else {
    // 非対応ブラウザ向けフォールバック（従来の自動ダウンロード）
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    a.click();
    URL.revokeObjectURL(url);
  }
}

async function downloadGeoJSON() {
  const geojson = drawnItems.toGeoJSON();

  geojson.features = geojson.features.map((f) => addMeasurementProperties(f));

  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: "application/json"
  });

  await saveWithPicker(blob, "drawings.geojson", "application/json", ".geojson");
}

async function downloadKML() {
  const geojson = drawnItems.toGeoJSON();

  geojson.features = geojson.features.map((f) => addMeasurementProperties(f));

  let kml = tokml(geojson);

  const styles = `
  <Style id="polyStyle">
    <LineStyle>
      <color>ff0000ff</color>
      <width>2</width>
    </LineStyle>
    <PolyStyle>
      <color>7f0000ff</color>
      <fill>1</fill>
      <outline>1</outline>
    </PolyStyle>
  </Style>

  <Style id="lineStyle">
    <LineStyle>
      <color>ff0000ff</color>
      <width>3</width>
    </LineStyle>
  </Style>
  `;

  // スタイル挿入
  kml = kml.replace("<Document>", `<Document>${styles}`);

  // スタイル適用（既存仕様を維持）
  kml = kml.replace(
    /<Placemark>/g,
    `<Placemark><styleUrl>#polyStyle</styleUrl>`
  );
  kml = kml.replace(
    /<LineString>/g,
    `<styleUrl>#lineStyle</styleUrl><LineString>`
  );

  // Polygon / Line 用 ExtendedData を styleUrl の前に挿入
  const exts = geojson.features
    .filter(
      (f) =>
        f.geometry &&
        f.geometry.type !== "Point" &&
        f.geometry.type !== "MultiPoint"
    )
    .map((f) => featureToExtendedData(f.properties));

  let idx = 0;
  kml = kml.replace(
    /<styleUrl>#polyStyle<\/styleUrl>/g,
    () => `${exts[idx++] || ""}<styleUrl>#polyStyle</styleUrl>`
  );
  kml = kml.replace(
    /<styleUrl>#lineStyle<\/styleUrl>/g,
    () => `${exts[idx++] || ""}<styleUrl>#lineStyle</styleUrl>`
  );

  const blob = new Blob([kml], {
    type: "application/vnd.google-earth.kml+xml"
  });

  await saveWithPicker(
    blob,
    "drawings.kml",
    "application/vnd.google-earth.kml+xml",
    ".kml"
  );
}

/* ----------------------------------------
   8. 保存ボタンのイベント処理
---------------------------------------- */
document.addEventListener("click", (e) => {
  if (e.target.id === "btnSaveGeoJSON") downloadGeoJSON();
  if (e.target.id === "btnSaveKML") downloadKML();
});
