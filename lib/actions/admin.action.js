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

// ✅ Get system statistics
export async function getSystemStats() {
  try {
    const [usersSnapshot, internshipsSnapshot, jobsSnapshot, interviewsSnapshot, coursesSnapshot] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("internships").count().get(),
      db.collection("jobs").count().get(),
      db.collection("interviews").count().get(),
      db.collection("courses").count().get(),
    ]);

    return {
      success: true,
      stats: {
        users: usersSnapshot.data().count || 0,
        internships: internshipsSnapshot.data().count || 0,
        jobs: jobsSnapshot.data().count || 0,
        interviews: interviewsSnapshot.data().count || 0,
        courses: coursesSnapshot.data().count || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching system stats:", error);
    return {
      success: false,
      stats: {
        users: 0,
        internships: 0,
        jobs: 0,
        interviews: 0,
        courses: 0,
      },
    };
  }
}

// ✅ Create user (admin function)
export async function createUser(userData) {
  try {
    const { email, password, name, role = "user" } = userData;

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    });

    // Create user profile in Firestore
    await db.collection("users").doc(userRecord.uid).set({
      id: userRecord.uid,
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return { success: true, userId: userRecord.uid, message: "User created successfully" };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Delete user (admin function)
export async function deleteUser(userId) {
  try {
    // Delete from Firebase Auth
    await auth.deleteUser(userId);

    // Delete from Firestore
    await db.collection("users").doc(userId).delete();

    // Log admin action
    await db.collection("admin_logs").add({
      action: "delete_user",
      userId,
      adminId: "system",
      timestamp: new Date().toISOString(),
      ip: "127.0.0.1",
    });

    revalidatePath("/admin/users");

    return { success: true, message: "User deleted successfully" };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, error: error.message };
  }
}
// ✅ Update user profile information
export async function updateUserProfile(userId, profileData) {
  try {
    const { name, email, bio, phone, location, profileURL } = profileData;

    // Update Firestore user document
    await db.collection("users").doc(userId).set(
      {
        name,
        email,
        bio,
        phone,
        location,
        profileURL,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Update auth email if changed
    if (email) {
      try {
        await auth.updateUser(userId, { email });
      } catch (error) {
        console.warn("Could not update email in Auth:", error);
      }
    }

    // Log admin action
    await db.collection("admin_logs").add({
      action: "update_user_profile",
      userId,
      adminId: "system",
      changes: profileData,
      timestamp: new Date().toISOString(),
      ip: "127.0.0.1",
    });

    revalidatePath(`/admin/users/${userId}`);

    return { success: true, message: "User profile updated successfully" };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Disable/Enable user account
export async function updateUserStatus(userId, disabled) {
  try {
    // Update user status in Firebase Auth
    await auth.updateUser(userId, { disabled });

    // Update Firestore
    await db.collection("users").doc(userId).set(
      {
        disabled,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Log admin action
    await db.collection("admin_logs").add({
      action: disabled ? "disable_user" : "enable_user",
      userId,
      adminId: "system",
      timestamp: new Date().toISOString(),
      ip: "127.0.0.1",
    });

    revalidatePath("/admin/users");

    return {
      success: true,
      message: `User ${disabled ? "disabled" : "enabled"} successfully`,
    };
  } catch (error) {
    console.error("Error updating user status:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Reset user password
export async function resetUserPassword(userId, newPassword) {
  try {
    // Reset password using Firebase Admin SDK
    await auth.updateUser(userId, {
      password: newPassword,
    });

    // Log admin action
    await db.collection("admin_logs").add({
      action: "reset_user_password",
      userId,
      adminId: "system",
      timestamp: new Date().toISOString(),
      ip: "127.0.0.1",
    });

    revalidatePath(`/admin/users/${userId}`);

    return { success: true, message: "User password reset successfully" };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Verify user email
export async function verifyUserEmail(userId) {
  try {
    // Update user in Firebase Auth
    await auth.updateUser(userId, {
      emailVerified: true,
    });

    // Update Firestore
    await db.collection("users").doc(userId).set(
      {
        emailVerified: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Log admin action
    await db.collection("admin_logs").add({
      action: "verify_user_email",
      userId,
      adminId: "system",
      timestamp: new Date().toISOString(),
      ip: "127.0.0.1",
    });

    revalidatePath(`/admin/users/${userId}`);

    return { success: true, message: "User email verified successfully" };
  } catch (error) {
    console.error("Error verifying email:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Update user permissions
export async function updateUserPermissions(userId, permissions) {
  try {
    const user = await auth.getUser(userId);
    const oldClaims = user.customClaims || {};

    // Update custom claims
    await auth.setCustomUserClaims(userId, {
      ...oldClaims,
      permissions,
    });

    // Update Firestore
    await db.collection("users").doc(userId).set(
      {
        permissions,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Log admin action
    await db.collection("admin_logs").add({
      action: "update_user_permissions",
      userId,
      adminId: "system",
      changes: { permissions },
      timestamp: new Date().toISOString(),
      ip: "127.0.0.1",
    });

    revalidatePath(`/admin/users/${userId}`);

    return { success: true, message: "User permissions updated successfully" };
  } catch (error) {
    console.error("Error updating permissions:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Get admin action logs
export async function getAdminLogs(params = {}) {
  try {
    const { page = 1, limit = 50, action = "", userId = "" } = params;

    let query = db.collection("admin_logs");

    if (action) {
      query = query.where("action", "==", action);
    }

    if (userId) {
      query = query.where("userId", "==", userId);
    }

    const snapshot = await query
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    const logs = snapshot.docs.map((doc) =>
      serializeFirebaseData({
        id: doc.id,
        ...doc.data(),
      })
    );

    const total = (await db.collection("admin_logs").count().get()).data().count;

    return {
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("Error fetching admin logs:", error);
    return {
      success: false,
      logs: [],
      pagination: { page: 1, limit: 50, total: 0, pages: 0 },
    };
  }
}

// ✅ Bulk delete users
export async function bulkDeleteUsers(userIds) {
  try {
    const results = {
      successful: [],
      failed: [],
    };

    for (const userId of userIds) {
      try {
        await auth.deleteUser(userId);
        await db.collection("users").doc(userId).delete();

        results.successful.push(userId);

        // Log each deletion
        await db.collection("admin_logs").add({
          action: "delete_user",
          userId,
          adminId: "system",
          timestamp: new Date().toISOString(),
          ip: "127.0.0.1",
        });
      } catch (error) {
        results.failed.push({ userId, error: error.message });
      }
    }

    revalidatePath("/admin/users");

    return {
      success: results.failed.length === 0,
      message: `Deleted ${results.successful.length}/${userIds.length} users`,
      results,
    };
  } catch (error) {
    console.error("Error bulk deleting users:", error);
    return { success: false, error: error.message };
  }
}

// ✅ Search users with advanced filters
export async function searchUsers(filters = {}) {
  try {
    const { role, disabled, emailVerified, search, limit = 50 } = filters;

    let query = db.collection("users");

    if (role) {
      query = query.where("role", "==", role);
    }

    if (disabled !== undefined) {
      query = query.where("disabled", "==", disabled);
    }

    if (emailVerified !== undefined) {
      query = query.where("emailVerified", "==", emailVerified);
    }

    const snapshot = await query.limit(limit).get();

    let users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...serializeFirebaseData(doc.data()),
    }));

    // Client-side search if needed
    if (search) {
      users = users.filter(
        (user) =>
          user.name?.toLowerCase().includes(search.toLowerCase()) ||
          user.email?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return { success: true, users, count: users.length };
  } catch (error) {
    console.error("Error searching users:", error);
    return { success: false, users: [], count: 0, error: error.message };
  }
}

// ✅ Get detailed admin statistics
export async function getAdminStats() {
  try {
    const [
      totalUsers,
      adminUsers,
      disabledUsers,
      unverifiedEmails,
      recentLogins,
      adminLogs,
    ] = await Promise.all([
      db.collection("users").count().get(),
      db.collection("users").where("role", "==", "admin").count().get(),
      db.collection("users").where("disabled", "==", true).count().get(),
      db.collection("users").where("emailVerified", "==", false).count().get(),
      db.collection("users").orderBy("lastSignInTime", "desc").limit(10).get(),
      db.collection("admin_logs").orderBy("timestamp", "desc").limit(20).get(),
    ]);

    return {
      success: true,
      stats: {
        totalUsers: totalUsers.data().count || 0,
        adminUsers: adminUsers.data().count || 0,
        disabledUsers: disabledUsers.data().count || 0,
        unverifiedEmails: unverifiedEmails.data().count || 0,
        recentLogins: recentLogins.docs.length,
        recentAdminActions: adminLogs.docs.length,
      },
      recentUsers: recentLogins.docs.slice(0, 5).map((doc) =>
        serializeFirebaseData({
          id: doc.id,
          ...doc.data(),
        })
      ),
      recentLogs: adminLogs.docs.slice(0, 10).map((doc) =>
        serializeFirebaseData({
          id: doc.id,
          ...doc.data(),
        })
      ),
    };
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return {
      success: false,
      stats: {},
      recentUsers: [],
      recentLogs: [],
      error: error.message,
    };
  }
}

// ✅ Manage content - Delete jobs, internships, interviews, etc.
export async function deleteContent(contentType, contentId) {
  try {
    const validCollections = [
      "jobs",
      "internships",
      "interviews",
      "courses",
      "mock_tests",
    ];

    if (!validCollections.includes(contentType)) {
      return { success: false, error: "Invalid content type" };
    }

    // Delete from Firestore
    await db.collection(contentType).doc(contentId).delete();

    // Log admin action
    await db.collection("admin_logs").add({
      action: `delete_${contentType}`,
      contentId,
      contentType,
      adminId: "system",
      timestamp: new Date().toISOString(),
      ip: "127.0.0.1",
    });

    revalidatePath("/admin");

    return { success: true, message: `${contentType} deleted successfully` };
  } catch (error) {
    console.error(`Error deleting ${contentType}:`, error);
    return { success: false, error: error.message };
  }
}

// ✅ Get content statistics by type
export async function getContentStats() {
  try {
    const [jobs, internships, interviews, courses, mockTests, questions] =
      await Promise.all([
        db.collection("jobs").count().get(),
        db.collection("internships").count().get(),
        db.collection("interviews").count().get(),
        db.collection("courses").count().get(),
        db.collection("mock_tests").count().get(),
        db.collection("questions").count().get(),
      ]);

    return {
      success: true,
      content: {
        jobs: jobs.data().count || 0,
        internships: internships.data().count || 0,
        interviews: interviews.data().count || 0,
        courses: courses.data().count || 0,
        mockTests: mockTests.data().count || 0,
        questions: questions.data().count || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching content stats:", error);
    return {
      success: false,
      content: {
        jobs: 0,
        internships: 0,
        interviews: 0,
        courses: 0,
        mockTests: 0,
        questions: 0,
      },
    };
  }
}