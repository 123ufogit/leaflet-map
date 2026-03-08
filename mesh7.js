/* ============================================================
   7系メッシュインデックス（枠＋ラベルを1レイヤで制御）
   - 枠線はクリック不可
   - ラベルをクリックするとポップアップ表示
   - リンク先：令和6年能登半島地震関連データポータル（CKAN）
   ============================================================ */

fetch("data/7kei_mesh_index.geojson")
  .then(res => res.json())
  .then(json => {

    // LayerGroup（枠線＋ラベルをまとめる）
    const mesh7Group = L.layerGroup();

    /* --- 1. 図郭枠（灰色・クリック不可） --- */
    const mesh7LineLayer = L.geoJSON(json, {
      style: {
        color: "#888888",
        weight: 1,
        fill: false
      },
      interactive: false   // ★ 枠線はクリック不可
    }).addTo(mesh7Group);

    /* --- 2. 図郭名ラベル（灰色文字・クリックでポップアップ） --- */
    L.geoJSON(json, {
      onEachFeature: function (feature) {

        const label = feature.properties["図郭名"];
        if (!label) return;

        // ポップアップ内容（リンク先変更済み）
        const popupHtml = `
          <div style="font-size:14px;">
            <b>${label}</b><br>
            <a href="https://www.geospatial.jp/ckan/dataset/rinya-noto-portal"
               target="_blank"
               style="color:#0066cc;">
               令和6年能登半島地震関連データポータル
            </a>
          </div>
        `;

        // MultiPolygon の重心
        const center = turf.center(feature).geometry.coordinates;
        const latlng = L.latLng(center[1], center[0]);

        // ラベル（クリック可能）
        const marker = L.marker(latlng, {
          icon: L.divIcon({
            className: "mesh7-label",
            html: `<span style="color:#666666; font-size:12px; pointer-events:auto;">${label}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          })
        });

        // ★ ラベルクリックでポップアップ
        marker.bindPopup(popupHtml);

        marker.addTo(mesh7Group);
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
