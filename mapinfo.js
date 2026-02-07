/* ===== 周辺施設（GeoJSON） ===== */
const layerShuuhen = L.layerGroup().addTo(map);
fetch("data/points.geojson")
  .then(res => res.json())
  .then(json => {
    L.geoJSON(json, {
pointToLayer: (feature, latlng) => {
  const p = feature.properties;
  let html = "";

  // ① name（中央寄せタイトル）
  if (p.name) {
    html += `
      <div style="text-align:center; font-weight:bold; font-size:16px; margin-bottom:4px;">
        ${p.name}
      </div>
    `;
  }

  // ② address（小さめのサブ情報）
  if (p.address) {
    html += `
      <div style="font-size:13px; color:#555; margin-bottom:4px;">
        ${p.address}
      </div>
    `;
  }

  // ③ phone（スマホで発信できるリンク）
  if (p.phone) {
    html += `
      <div style="font-size:13px; margin-bottom:4px;">
        <a href="tel:${p.phone}" style="color:#0066cc;">
          ${p.phone}
        </a>
      </div>
    `;
  }

  // ④ url（Google マップで開くリンク）
  if (p.url && feature.geometry && feature.geometry.coordinates) {
    const [lng, lat] = feature.geometry.coordinates;
    const gmap = `https://www.google.com/maps?q=${lat},${lng}`;

    html += `
      <div style="margin-top:6px;">
        <a href="${gmap}" target="_blank" style="color:#0066cc;">
          Googleマップで開く
        </a>
      </div>
    `;
  }

  return L.marker(latlng).bindPopup(html);
}
    }).eachLayer(layer => layerShuuhen.addLayer(layer));
  });
