"use server";

import { auth, db } from "@/firebase/admin";
import { revalidatePath } from "next/cache";
import { serializeFirebaseData, snapshotToArray } from "@/lib/firebase-helpers";

// ✅ Check if user is admin
export async function isAdmin(userId) {
  try {
    if (!userId) return false;

    const user = await auth.getUser(userId);
    const customClaims = user.customClaims || {};

    return customClaims.admin === true || customClaims.super_admin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

// ✅ Get all users
export async function getAllUsers(params = {}) {
  try {
    const { page = 1, limit = 50, search = "", role = "" } = params;

    let query = db.collection("users");

    if (search) {
      query = query
        .where("email", ">=", search)
        .where("email", "<=", search + "\uf8ff");
    }

    if (role) {
      query = query.where("role", "==", role);
    }

    const snapshot = await query.orderBy("createdAt", "desc").limit(limit).get();

    const users = [];

    for (const doc of snapshot.docs) {
      const userData = doc.data();

      try {
        const authUser = await auth.getUser(doc.id);

        users.push({
          id: doc.id,
          ...serializeFirebaseData(userData),
          email: authUser.email || userData.email,
          emailVerified: authUser.emailVerified,
          disabled: authUser.disabled,
          lastSignInTime: authUser.metadata?.lastSignInTime
            ? new Date(authUser.metadata.lastSignInTime).toISOString()
            : null,
          creationTime: authUser.metadata?.creationTime
            ? new Date(authUser.metadata.creationTime).toISOString()
            : null,
        });
      } catch (error) {
        users.push({
          id: doc.id,
          ...serializeFirebaseData(userData),
          error: "Auth data not found",
        });
      }
    }

    const total = (await db.collection("users").count().get()).data().count;

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    return { users: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } };
  }
}

// ✅ Get user by ID
export async function getUserById(userId) {
  try {
    const [userDoc, authUser] = await Promise.all([
      db.collection("users").doc(userId).get(),
      auth.getUser(userId),
    ]);

    if (!userDoc.exists) {
      return serializeFirebaseData({
        id: userId,
        email: authUser.email,
        emailVerified: authUser.emailVerified,
        disabled: authUser.disabled,
        customClaims: authUser.customClaims || {},
      });
    }

    return serializeFirebaseData({
      id: userId,
      ...userDoc.data(),
      email: authUser.email,
      emailVerified: authUser.emailVerified,
      disabled: authUser.disabled,
      customClaims: authUser.customClaims || {},
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
}

// ✅ Update user role
export async function updateUserRole(userId, roleData) {
  try {
    const { role, permissions, notes } = roleData;

    const existingUser = await auth.getUser(userId);
    const oldClaims = existingUser.customClaims || {};

    // ✅ Update claims in Firebase Auth
    await auth.setCustomUserClaims(userId, {
      ...oldClaims,
      admin: role === "admin" || role === "super_admin",
      super_admin: role === "super_admin",
      role,
      permissions,
    });

    // ✅ Update Firestore user doc (IMPORTANT FIX → use ISO string)
    await db.collection("users").doc(userId).set(
      {
        role,
        permissions,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // ✅ Log admin action (ISO string)
    await db.collection("admin_logs").add({
      action: "update_user_role",
      userId,
      adminId: "system",
      changes: { role, permissions },
      notes,
      timestamp: new Date().toISOString(),
      ip: "127.0.0.1",
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);

    return { success: true, message: "User role updated successfully" };
  } catch (error) {
    console.error("Error updating user role:", error);
    return { success: false, error: error.message };
  }
}
