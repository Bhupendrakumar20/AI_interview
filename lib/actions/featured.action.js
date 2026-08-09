"use server";

import { db } from "@/firebase/admin";
import { revalidatePath } from "next/cache";
import { serializeFirebaseData } from "@/lib/firebase-helpers";

const DEFAULT_FEATURED = [
  {
    title: "One Day Internship",
    company: "with Ankit",
    description: "Quick internship opportunity to gain real-world experience",
    type: "internship",
    buttonText: "Apply Now",
    badge: "One Day"
  },
  {
    title: "Quest Ingenium",
    company: "Solving the world's hardest engineering problems",
    description: "Win prizes and get engineering facility visits",
    type: "competition",
    prize: "₹2,00,000+",
    stats: ["2,00,000+ Runners-Up", "1,60,000+ Overviews", "Engineering Facility Visit"],
    buttonText: "Register Now"
  },
  {
    title: "tbo.com",
    description: "Stand a chance to win Rs 3 lacs prize money and gain interview opportunities",
    type: "competition",
    prize: "₹3,0,000",
    buttonText: "Learn More"
  },
  {
    title: "Unstop Talent Awards",
    description: "Unstoppable Talent. Unmatched Impact.",
    type: "award",
    buttonText: "View Awards"
  }
];

export async function getFeaturedItems() {
  try {
    const snapshot = await db.collection("featured_items").orderBy("createdAt", "asc").get();
    
    if (snapshot.empty) {
      // Auto-seed default items
      const batch = db.batch();
      const itemsToReturn = [];
      
      for (const item of DEFAULT_FEATURED) {
        const docRef = db.collection("featured_items").doc();
        const data = {
          ...item,
          createdAt: new Date().toISOString()
        };
        batch.set(docRef, data);
        itemsToReturn.push({ id: docRef.id, ...data });
      }
      
      await batch.commit();
      return itemsToReturn;
    }
    
    return snapshot.docs.map(doc => serializeFirebaseData({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Error fetching featured items:", error);
    // Return defaults as fallback so the site never breaks
    return DEFAULT_FEATURED.map((item, idx) => ({ id: `fallback-${idx}`, ...item }));
  }
}

export async function addFeaturedItem(data) {
  try {
    const docRef = await db.collection("featured_items").add({
      ...data,
      createdAt: new Date().toISOString()
    });
    
    // Log admin action
    try {
      await db.collection("admin_logs").add({
        action: "add_featured_item",
        contentId: docRef.id,
        contentType: "featured_items",
        adminId: "admin_001", // Default admin identifier
        timestamp: new Date(),
        ip: "127.0.0.1",
        description: `Added featured card: ${data.title}`
      });
    } catch (logError) {
      console.error("Failed to write to admin_logs:", logError);
    }

    revalidatePath("/");
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding featured item:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteFeaturedItem(id) {
  try {
    await db.collection("featured_items").doc(id).delete();
    
    // Log admin action
    try {
      await db.collection("admin_logs").add({
        action: "delete_featured_item",
        contentId: id,
        contentType: "featured_items",
        adminId: "admin_001",
        timestamp: new Date(),
        ip: "127.0.0.1",
        description: `Deleted featured card with ID: ${id}`
      });
    } catch (logError) {
      console.error("Failed to write to admin_logs:", logError);
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Error deleting featured item:", error);
    return { success: false, error: error.message };
  }
}
