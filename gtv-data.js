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
   1-1. 属性付与（GeoJSON フィーチャ）
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
   2. Draw イベント
---------------------------------------- */
map.on(L.Draw.Event.CREATED, (e) => {
  const layer = e.layer;
  layer.options.pane = "vectorPane";
  drawnItems.addLayer(layer);
  bindMeasurementPopup(layer);
});

/* ----------------------------------------
   3. GeoJSON / KML 専用処理
---------------------------------------- */
async function handleVectorFile(file) {
  const name = file.name.toLowerCase();

  // GeoJSON
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
    return true;
  }

  // KML
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
    return true;
  }

  return false;
}

/* ----------------------------------------
   4. 保存処理
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

  kml = kml.replace("<Document>", `<Document>${styles}`);

  kml = kml.replace(
    /<Placemark>/g,
    `<Placemark><styleUrl>#polyStyle</styleUrl>`
  );
  kml = kml.replace(
    /<LineString>/g,
    `<styleUrl>#lineStyle</styleUrl><LineString>`
  );

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
   5. 保存ボタン
---------------------------------------- */
document.addEventListener("click", (e) => {
  if (e.target.id === "btnSaveGeoJSON") downloadGeoJSON();
  if (e.target.id === "btnSaveKML") downloadKML();
});
