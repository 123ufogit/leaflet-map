/* ============================================================
   mapinfo.js  —  情報レイヤ（周辺施設 + TLSエリアリンク）
   ============================================================ */


/* ------------------------------------------------------------
   1. 周辺施設レイヤ（points.geojson）
   ------------------------------------------------------------ */

// 周辺施設専用アイコン（青：人工物）
const facilityIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

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

        // ② address
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

        // ④ Google マップリンク
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

        return L.marker(latlng, { icon: facilityIcon }).bindPopup(html);
      }
    }).eachLayer(layer => layerShuuhen.addLayer(layer));
  });



/* ------------------------------------------------------------
   2. TLSエリアの中心にリンク付きポップアップを配置
   ------------------------------------------------------------ */

// TLSエリア専用アイコン（赤：重要地点）
const tlsAreaIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

fetch("data/TLS_area.geojson")
  .then(res => res.json())
  .then(json => {

    json.features.forEach(f => {
      const name = f.properties["エリア"];
      if (!name) return;

      // ★ ポリゴンの中心点（centroid）
      const centroid = turf.centroid(f);
      const [lng, lat] = centroid.geometry.coordinates;

      // ★ treebrowse.html のリンク
      const link = `https://123ufogit.github.io/leaflet-map/treebrowse.html?lat=${lat}&lng=${lng}&area=${encodeURIComponent(name)}`;

      // ★ ポップアップ HTML
      const html = `
        <div style="text-align:center;">
          <b>${name}</b><br>
          <a href="${link}" target="_blank" style="color:#0066cc;">
            このエリアの詳細を見る
          </a>
        </div>
      `;

      // ★ 赤マーカーで配置
      const marker = L.marker([lat, lng], { icon: tlsAreaIcon });

      marker.bindPopup(html);
      marker.addTo(map);
    });
  });
