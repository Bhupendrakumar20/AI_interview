// lib/firebase-helpers.js

/**
 * Safely serialize Firebase data for React components
 */
export function serializeFirebaseData(data) {
  const replacer = (key, value) => {
    // Handle Firebase Timestamp (Admin SDK)
    if (value && typeof value === "object" && "toDate" in value) {
      return value.toDate().toISOString();
    }

    // Handle Firestore Timestamp (client SDK)
    if (
      value &&
      typeof value === "object" &&
      "_seconds" in value &&
      "_nanoseconds" in value
    ) {
      return new Date(value._seconds * 1000).toISOString();
    }

    // Handle Date objects
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  };

  return JSON.parse(JSON.stringify(data, replacer));
}

/**
 * Convert Firestore document to plain object
 */
export function docToObject(doc) {
  if (!doc.exists) return null;

  const data = doc.data();
  return {
    id: doc.id,
    ...serializeFirebaseData(data),
  };
}

/**
 * Convert Firestore query snapshot to array of plain objects
 */
export function snapshotToArray(snapshot) {
  return snapshot.docs.map((doc) => docToObject(doc));
}

/**
 * Format date from ISO string or Firebase Timestamp
 */
export function formatDate(dateValue, options = {}) {
  if (!dateValue) return "N/A";

  let date;

  if (typeof dateValue === "string") {
    date = new Date(dateValue);
  } else if (dateValue && typeof dateValue === "object") {
    if ("toDate" in dateValue) {
      date = dateValue.toDate();
    } else if ("_seconds" in dateValue) {
      date = new Date(dateValue._seconds * 1000);
    } else {
      return "Invalid Date";
    }
  } else {
    return "Invalid Date";
  }

  if (isNaN(date.getTime())) {
    return "Invalid Date";
  }

  const defaultOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };

  return date.toLocaleDateString("en-US", { ...defaultOptions, ...options });
}
