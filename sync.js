/* ============================================================
   sync.js — 編集キューを GitHub Issue に一括送信する
   ============================================================ */

/* ===== GitHub API 設定 ===== */
const GITHUB_OWNER = "123ufogit";
const GITHUB_REPO = "leaflet-map";

/* ===== GitHub Issue を作成する関数 ===== */
async function createGitHubIssue(title, body) {
  const token = localStorage.getItem("github_token");
  if (!token) {
    alert("GitHub Token が設定されていません。");
    return false;
  }

  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/issues`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github+json"
    },
    body: JSON.stringify({
      title,
      body
    })
  });

  return res.ok;
}

/* ============================================================
   編集キューを GitHub に送信するメイン関数
   ============================================================ */

async function syncEdits() {
  if (!navigator.onLine) {
    console.log("オフラインのため同期できません");
    return;
  }

  const queue = await window.getEditQueue();
  if (queue.length === 0) {
    console.log("同期する編集はありません");
    return;
  }

  /* ===== エリアごとにグループ化 ===== */
  const grouped = {};
  for (const edit of queue) {
    const area = edit.area || "unknown";
    if (!grouped[area]) grouped[area] = [];
    grouped[area].push(edit);
  }

  /* ===== エリアごとに Issue を作成 ===== */
  for (const area of Object.keys(grouped)) {
    const edits = grouped[area];

    const issueTitle = `Field Edits (${area}) — ${new Date().toLocaleString()}`;

    const issueBody = `
### Field Edits for Area: **${area}**

Path: \`data/${area}/tree.csv\`

Edits:
\`\`\`json
${JSON.stringify(edits, null, 2)}
\`\`\`

Please update the CSV accordingly.
`;

    const ok = await createGitHubIssue(issueTitle, issueBody);

    if (!ok) {
      alert(`GitHub Issue の作成に失敗しました（Area: ${area}）`);
      return;
    }
  }

  /* ===== 送信成功したらキューをクリア ===== */
  await window.clearEditQueue();
  alert("編集内容を GitHub に送信しました（Issue 作成済み）");
}

/* ============================================================
   オンライン復帰時に自動同期
   ============================================================ */

window.addEventListener("online", () => {
  console.log("オンライン復帰 → 自動同期を開始");
  syncEdits();
});

/* ===== グローバル公開 ===== */
window.syncEdits = syncEdits;
