// components/SafeDataWrapper.jsx
"use client";

import { useEffect, useState } from "react";

export function SafeDataWrapper({ data, children }) {
  const [safeData, setSafeData] = useState(null);

  useEffect(() => {
    // Convert data to safe format
    const convertData = (item) => {
      if (!item) return item;
      
      if (Array.isArray(item)) {
        return item.map(convertData);
      }
      
      if (typeof item === 'object' && item !== null) {
        // Handle Firebase Timestamp
        if (item._seconds !== undefined && item._nanoseconds !== undefined) {
          return new Date(item._seconds * 1000).toISOString();
        }
        
        // Convert all object properties
        const converted = {};
        for (const key in item) {
          if (Object.prototype.hasOwnProperty.call(item, key)) {
            converted[key] = convertData(item[key]);
          }
        }
        return converted;
      }
      
      return item;
    };

    setSafeData(convertData(data));
  }, [data]);

  if (!safeData) {
    return <div>Loading...</div>;
  }

  return children(safeData);
}