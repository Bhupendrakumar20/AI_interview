// lib/firebase-utils.js
export function convertFirebaseData(data) {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => convertFirebaseData(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    // Handle Firebase Timestamp
    if (data._seconds !== undefined && data._nanoseconds !== undefined) {
      return new Date(data._seconds * 1000).toISOString();
    }
    
    // Handle other objects
    const converted = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        converted[key] = convertFirebaseData(data[key]);
      }
    }
    return converted;
  }
  
  return data;
}

// Alternative: Convert specific Firebase types
export function convertTimestamp(timestamp) {
  if (!timestamp) return null;
  
  if (timestamp._seconds !== undefined && timestamp._nanoseconds !== undefined) {
    return new Date(timestamp._seconds * 1000).toISOString();
  }
  
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  return timestamp;
}