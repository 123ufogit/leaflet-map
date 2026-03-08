/* ============================================================
   7系メッシュインデックス（GeoJSON 読み込み）
   ============================================================ */

fetch("data/7kei_mesh_index.geojson")
  .then(res => res.json())
  .then(json => {
    const mesh7Layer = L.geoJSON(json, {
      style: {
        color: "#ff6600",
        weight: 1,
        fill: false
      }
    });

    // overlayControl が存在すれば登録
    if (window.overlayControl) {
      window.overlayControl.addOverlay(mesh7Layer, "7系メッシュインデックス");
    }

    // 初期表示したい場合
    mesh7Layer.addTo(map);

    console.log("7系メッシュインデックスを読み込みました");
  })
  .catch(err => console.error("7系メッシュ読み込みエラー:", err));
