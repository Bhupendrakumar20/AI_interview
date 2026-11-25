const DATABASE_NAME = "prepwise-mock-test";
const STORE_NAME = "preparations";
const RECORD_KEY = "active";

function openPreparationDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("This browser does not support IndexedDB."));
      return;
    }

    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open local test storage."));
  });
}

export async function loadMockTestPreparation() {
  const database = await openPreparationDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .get(RECORD_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Could not restore saved test progress."));
    });
  } finally {
    database.close();
  }
}

export async function saveMockTestPreparation(preparation) {
  const database = await openPreparationDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put({
        ...preparation,
        key: RECORD_KEY,
        savedAt: Date.now(),
      });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Could not save test progress."));
      transaction.onabort = () => reject(transaction.error || new Error("Saving test progress was aborted."));
    });
  } finally {
    database.close();
  }
}

export async function clearMockTestPreparation() {
  const database = await openPreparationDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).delete(RECORD_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Could not clear saved test progress."));
      transaction.onabort = () => reject(transaction.error || new Error("Clearing test progress was aborted."));
    });
  } finally {
    database.close();
  }
}
