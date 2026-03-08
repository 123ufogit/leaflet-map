/* ============================================================
   7系メッシュインデックス（枠＋ラベルを1レイヤで制御）
   ============================================================ */

fetch("data/7kei_mesh_index.geojson")
  .then(res => res.json())
  .then(json => {

    // LayerGroup（枠線＋ラベルをまとめる）
    const mesh7Group = L.layerGroup();

    /* --- 1. 図郭枠（灰色） --- */
    const mesh7LineLayer = L.geoJSON(json, {
      style: {
        color: "#888888",   // 灰色
        weight: 1,
        fill: false
      },
      onEachFeature: function (feature, layer) {

        // 図郭名
        const name = feature.properties["図郭名"] || "図郭";

        // ポップアップ内容
        const popupHtml = `
          <div style="font-size:14px;">
            <b>${name}</b><br>
            <a href="https://www.maff.go.jp/j/press/kanbo/bunsyo/240207.html"
               target="_blank"
               style="color:#0066cc;">
               令和6年能登半島地震関連データポータル
            </a>
          </div>
        `;

        layer.bindPopup(popupHtml);
      }
    }).addTo(mesh7Group);

    /* --- 2. 図郭名ラベル（灰色文字） --- */
    L.geoJSON(json, {
      onEachFeature: function (feature) {
        const label = feature.properties["図郭名"];
        if (!label) return;

        // MultiPolygon の重心を計算
        const center = turf.center(feature).geometry.coordinates;
        const latlng = L.latLng(center[1], center[0]);

        L.marker(latlng, {
          icon: L.divIcon({
            className: "mesh7-label",
            html: `<span style="color:#666666; font-size:12px;">${label}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          })
        }).addTo(mesh7Group);
      }
    });

    /* --- 3. overlayControl に登録（1レイヤだけ） --- */
    if (window.overlayControl) {
      window.overlayControl.addOverlay(mesh7Group, "7系メッシュ");
    }

    /* --- 4. 初期表示 --- */
    mesh7Group.addTo(map);

    console.log("7系メッシュ（枠＋ラベル＋ポップアップ）を読み込みました");
  })
  .catch(err => console.error("7系メッシュ読み込みエラー:", err));
