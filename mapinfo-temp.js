/* ============================================================
   mapinfo.js  —  情報レイヤ（周辺施設 + TLSエリアリンク）
   ============================================================ */

/* ------------------------------------------------------------
   0. レイヤ宣言（初期は非表示）
   ------------------------------------------------------------ */

const layerShuuhen = L.layerGroup();      // 周辺施設（初期非表示）
const layerTLSinfo = L.layerGroup().addTo(map);      // TLSエリア中心リンク（初期非表示）


/* ------------------------------------------------------------
   1. 周辺施設レイヤ（points.geojson）
   ------------------------------------------------------------ */

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

        return L.marker(latlng).bindPopup(html);
      }
    }).eachLayer(layer => layerShuuhen.addLayer(layer));
  });


/* ------------------------------------------------------------
   2. TLSエリアの中心にリンク付きポップアップを配置
   ------------------------------------------------------------ */

fetch("data/TLS_area.geojson")
  .then(res => res.json())
  .then(json => {

    json.features.forEach(f => {
      const name = f.properties["エリア"];
      if (!name) return;

      // ポリゴンの中心点（centroid）
      const centroid = turf.centroid(f);
      const [lng, lat] = centroid.geometry.coordinates;

      // treebrowse.html のリンク
      const link = `https://123ufogit.github.io/leaflet-map/treebrowse.html?lat=${lat}&lng=${lng}&area=${encodeURIComponent(name)}`;

      // ポップアップ HTML
      const html = `
        <div style="text-align:center;">
          <b>森林調査：${name}</b><br>
          <a href="${link}" target="_blank" style="color:#0066cc;">
            このエリアの詳細を見る
          </a>
        </div>
      `;

      L.marker([lat, lng])
        .bindPopup(html)
        .addTo(layerTLSinfo);
    });
  });


/* ------------------------------------------------------------
   3. レイヤコントロールに登録（初期は非表示）
   ------------------------------------------------------------ */

L.control.layers(
  null,
  {
    "周辺施設": layerShuuhen,
    "TLSエリア（リンク）": layerTLSinfo
  },
  { position: "bottomleft" }
).addTo(map);
