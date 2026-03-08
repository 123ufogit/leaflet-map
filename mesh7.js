/* ============================================================
   7系メッシュインデックス（GeoJSON 読み込み + ラベル表示）
   ============================================================ */

fetch("data/7kei_mesh_index.geojson")
  .then(res => res.json())
  .then(json => {

    /* --- 1. 図郭枠（灰色） --- */
    const mesh7LineLayer = L.geoJSON(json, {
      style: {
        color: "#888888",   // 灰色
        weight: 1,
        fill: false
      }
    });

    /* --- 2. 図郭名ラベル（灰色文字） --- */
    const mesh7LabelLayer = L.geoJSON(json, {
      pointToLayer: function (feature, latlng) {
        // 図郭名の属性名（例：feature.properties["図郭名"]）
        const label = feature.properties["図郭名"] || feature.properties["name"] || "";

        return L.marker(latlng, {
          icon: L.divIcon({
            className: "mesh7-label",
            html: `<span style="color:#666666; font-size:12px;">${label}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          })
        });
      }
    });

    /* --- 3. overlayControl に登録 --- */
    if (window.overlayControl) {
      window.overlayControl.addOverlay(mesh7LineLayer, "7系メッシュ（枠）");
      window.overlayControl.addOverlay(mesh7LabelLayer, "7系メッシュ（ラベル）");
    }

    /* --- 4. 初期表示（必要なら） --- */
    mesh7LineLayer.addTo(map);
    mesh7LabelLayer.addTo(map);

    console.log("7系メッシュインデックス（枠＋ラベル）を読み込みました");
  })
  .catch(err => console.error("7系メッシュ読み込みエラー:", err));
