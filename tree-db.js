/* ============================================================
   tree-db.js — IndexedDB によるローカルデータ管理
   ============================================================ */

const DB_NAME = "forestSurveyDB";
const STORE_TREES = "trees";        // tree.csv のローカルコピー
const STORE_QUEUE = "editQueue";    // 編集キュー（後で一括送信）

let db;

/* ===== DB 初期化 ===== */
export function initDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = (e) => {
      db = e.target.result;

      if (!db.objectStoreNames.contains(STORE_TREES)) {
        db.createObjectStore(STORE_TREES, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { autoIncrement: true });
      }
    };

    req.onsuccess = (e) => {
      db = e.target.result;
      resolve();
    };

    req.onerror = (e) => reject(e);
  });
}

/* ============================================================
   1. tree.csv のローカルコピー管理
   ============================================================ */

/* 立木データを保存（上書き） */
export function saveTree(tree) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TREES, "readwrite");
    tx.objectStore(STORE_TREES).put(tree);
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

/* 立木データを取得 */
export function getTree(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TREES, "readonly");
    const req = tx.objectStore(STORE_TREES).get(id);

    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

/* 全立木データを取得 */
export function getAllTrees() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TREES, "readonly");
    const req = tx.objectStore(STORE_TREES).getAll();

    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

/* ============================================================
   2. 編集キュー（複数編集を一括送信するためのバッファ）
   ============================================================ */

/* 編集内容をキューに追加 */
export function queueEdit(editObj) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    tx.objectStore(STORE_QUEUE).add(editObj);
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

/* キューの全内容を取得 */
export function getEditQueue() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readonly");
    const req = tx.objectStore(STORE_QUEUE).getAll();

    req.onsuccess = () => resolve(req.result);
    req.onerror = reject;
  });
}

/* キューをクリア（送信後に実行） */
export function clearEditQueue() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readwrite");
    tx.objectStore(STORE_QUEUE).clear();
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}
