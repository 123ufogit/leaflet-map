# プロジェクト名

ここには Leaflet で表示する地図データを置きます。大きなファイルは Git LFS で管理してください。

https://123ufogit.github.io/leaflet-map/

簡単な使い方
1. Leaflet を読み込む（公式 CDN を利用）
2. data フォルダにある GeoJSON やタイルファイルを参照して表示します

GeoJSON の表示例（簡単）
```html
<script>
fetch('data/map.geojson')
  .then(r => r.json())
  .then(geojson => {
    L.geoJSON(geojson).addTo(map);
  });
</script>
```

注意
- 100MB を超えるファイルは通常の git push で拒否されます。大きなファイルは Git LFS を使うか、外部ホスティング（例：S3）を検討してください。
- .gitattributes を先に置いておくと、誤って大きなファイルを通常コミットする事故を防げます。

追加方法（GitHub web）
1. リポジトリページ → 「Add file」→「Create new file」  
2. ファイル名に `.gitattributes` / `README.md` を入力して内容を貼る  
3. Commit（例: "Add .gitattributes and README"）
