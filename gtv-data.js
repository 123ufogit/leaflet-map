/* ----------------------------------------
   1. 計測ポップアップ
---------------------------------------- */
function bindMeasurementPopup(layer) {
  let html = "";

  /* ---- Polygon ---- */
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

      html += `面積: ${ha.toFixed(2)} ha<br>` +
              `　　 (${sqm.toLocaleString()} m²)<br>`;
    });
  }

  /* ---- Polyline ---- */
  else if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
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
  }

  /* ---- Marker ---- */
  else if (layer instanceof L.Marker) {
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
   2. 描画イベント（Draw）
---------------------------------------- */
map.on(L.Draw.Event.CREATED, (e) => {
  const layer = e.layer;
  layer.options.pane = "vectorPane";
  drawnItems.addLayer(layer);
  bindMeasurementPopup(layer);
});

/* ----------------------------------------
   3. GeoTIFF 読み込み
---------------------------------------- */
let currentLayer = null;

async function loadGeoTIFF(arrayBuffer) {
  const georaster = await parseGeoraster(arrayBuffer, {
    buildPyramid: false
  });

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
}

/* ----------------------------------------
   4. ファイル種別判定
---------------------------------------- */
async function handleFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".tif") || name.endsWith(".tiff")) {
    const arrayBuffer = await file.arrayBuffer();
    await loadGeoTIFF(arrayBuffer);
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
   7. GeoJSON / KML 保存
---------------------------------------- */
function downloadGeoJSON() {
  const geojson = drawnItems.toGeoJSON();
  const blob = new Blob([JSON.stringify(geojson)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "drawings.geojson";
  a.click();

  URL.revokeObjectURL(url);
}

function downloadKML() {
  const geojson = drawnItems.toGeoJSON();
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

  kml = kml.replace("<Document>", `<Document>${styles}`);
  kml = kml.replace(/<Placemark>/g, `<Placemark><styleUrl>#polyStyle</styleUrl>`);
  kml = kml.replace(/<LineString>/g, `<styleUrl>#lineStyle</styleUrl><LineString>`);

  const blob = new Blob([kml], {
    type: "application/vnd.google-earth.kml+xml"
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "drawings.kml";
  a.click();

  URL.revokeObjectURL(url);
}

/* ----------------------------------------
   8. 保存ボタンのイベント処理
---------------------------------------- */
document.addEventListener("click", (e) => {
  if (e.target.id === "btnSaveGeoJSON") downloadGeoJSON();
  if (e.target.id === "btnSaveKML") downloadKML();
});
