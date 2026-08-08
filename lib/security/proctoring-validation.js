/**
 * Server-Side Proctoring Validation System
 * Validates camera, audio, and session integrity server-side
 * Prevents client-side spoofing and cheating
 */

import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";

/**
 * Proctoring violation severity levels
 */
export const VIOLATION_SEVERITY = {
  CRITICAL: "critical", // Immediate session termination
  HIGH: "high", // Multiple violations warrant review
  MEDIUM: "medium", // Warning to user
  LOW: "low", // Logged but not enforced
};

/**
 * Session proctoring rules
 */
export const PROCTORING_RULES = {
  // Camera requirements
  camera: {
    required: true,
    continuousMonitoring: true,
    offlineToleranceMs: 30000, // 30 seconds max offline
    maxOfflineIncidents: 3,
  },

  // Audio requirements
  audio: {
    required: true,
    maxNoiseLevel: 85, // Decibels
    allowMuteToggle: false, // Cannot mute audio
    multipleVoices: false, // Only candidate should speak
  },

  // Tab/window requirements
  tabs: {
    allowMultipleTabs: false,
    allowMultipleWindows: false,
    blockedKeywords: [
      "stackoverflow",
      "github",
      "leetcode",
      "geeksforgeeks",
      "chatgpt",
      "copilot",
      "gemini",
    ],
  },

  // Screen sharing and recording
  screen: {
    allowScreenShare: false, // Candidate shouldn't share screen
    allowedBrowsers: ["chrome", "firefox", "edge", "safari"],
    blockDevTools: true,
  },

  // Device requirements
  device: {
    requireSecureConnection: true, // HTTPS only
    blockPhoneDetection: true,
    blockNotesDetection: true,
    blockSecondMonitor: false, // Configurable
  },
};

/**
 * Validate camera stream availability and properties
 */
export async function validateCameraStream(sessionId, userId, cameraData) {
  const violations = [];

  try {
    // Check camera is active
    if (!cameraData?.isActive) {
      violations.push({
        type: "CAMERA_INACTIVE",
        severity: VIOLATION_SEVERITY.CRITICAL,
        message: "Camera is not active",
        timestamp: new Date(),
      });
    }

    // Check camera resolution (minimum 640x480 for face detection)
    if (cameraData?.width < 640 || cameraData?.height < 480) {
      violations.push({
        type: "LOW_CAMERA_RESOLUTION",
        severity: VIOLATION_SEVERITY.HIGH,
        message: `Camera resolution ${cameraData?.width}x${cameraData?.height} is too low`,
        timestamp: new Date(),
      });
    }

    // Check frame rate (minimum 15 FPS)
    if (cameraData?.frameRate < 15) {
      violations.push({
        type: "LOW_FRAME_RATE",
        severity: VIOLATION_SEVERITY.MEDIUM,
        message: `Frame rate ${cameraData?.frameRate} FPS is too low`,
        timestamp: new Date(),
      });
    }

    // Check camera offline duration
    if (cameraData?.offlineDurationMs > PROCTORING_RULES.camera.offlineToleranceMs) {
      violations.push({
        type: "CAMERA_OFFLINE_DURATION",
        severity: VIOLATION_SEVERITY.HIGH,
        message: `Camera offline for ${cameraData.offlineDurationMs}ms exceeds tolerance`,
        timestamp: new Date(),
      });
    }

    // Store validation result
    await recordProctorValidation(sessionId, userId, "camera", {
      isValid: violations.length === 0,
      violations,
      cameraData: sanitizeCameraData(cameraData),
    });

    return {
      valid: violations.length === 0,
      violations,
    };
  } catch (error) {
    console.error("Camera validation error:", error);
    throw new Error(`Camera validation failed: ${error.message}`);
  }
}

/**
 * Validate audio stream and properties
 */
export async function validateAudioStream(sessionId, userId, audioData) {
  const violations = [];

  try {
    // Check audio is active
    if (!audioData?.isActive) {
      violations.push({
        type: "AUDIO_INACTIVE",
        severity: VIOLATION_SEVERITY.CRITICAL,
        message: "Audio is not active",
        timestamp: new Date(),
      });
    }

    // Check multiple audio tracks
    if (audioData?.audioTracks && audioData.audioTracks > 1) {
      violations.push({
        type: "MULTIPLE_AUDIO_SOURCES",
        severity: VIOLATION_SEVERITY.HIGH,
        message: `Multiple audio sources detected: ${audioData.audioTracks}`,
        timestamp: new Date(),
      });
    }

    // Check audio permission
    if (!audioData?.permission) {
      violations.push({
        type: "AUDIO_PERMISSION_DENIED",
        severity: VIOLATION_SEVERITY.CRITICAL,
        message: "Audio permission was denied",
        timestamp: new Date(),
      });
    }

    // Check audio sample rate (minimum 16000 Hz)
    if (audioData?.sampleRate < 16000) {
      violations.push({
        type: "LOW_AUDIO_QUALITY",
        severity: VIOLATION_SEVERITY.MEDIUM,
        message: `Audio sample rate ${audioData.sampleRate} Hz is too low`,
        timestamp: new Date(),
      });
    }

    // Store validation result
    await recordProctorValidation(sessionId, userId, "audio", {
      isValid: violations.length === 0,
      violations,
      audioData: sanitizeAudioData(audioData),
    });

    return {
      valid: violations.length === 0,
      violations,
    };
  } catch (error) {
    console.error("Audio validation error:", error);
    throw new Error(`Audio validation failed: ${error.message}`);
  }
}

/**
 * Validate session environment and context
 */
export async function validateSessionEnvironment(sessionId, userId, environmentData) {
  const violations = [];

  try {
    // Check browser environment
    if (!environmentData?.browserInfo?.secureContext) {
      violations.push({
        type: "INSECURE_CONTEXT",
        severity: VIOLATION_SEVERITY.HIGH,
        message: "Not using secure connection (HTTPS)",
        timestamp: new Date(),
      });
    }

    // Check for devtools
    if (environmentData?.devToolsOpen) {
      violations.push({
        type: "DEVTOOLS_OPEN",
        severity: VIOLATION_SEVERITY.CRITICAL,
        message: "Developer tools detected",
        timestamp: new Date(),
      });
    }

    // Check for multiple tabs/windows
    if (environmentData?.windowCount > 1) {
      violations.push({
        type: "MULTIPLE_WINDOWS",
        severity: VIOLATION_SEVERITY.HIGH,
        message: `Multiple windows detected: ${environmentData.windowCount}`,
        timestamp: new Date(),
      });
    }

    // Check for tab switching
    if (
      environmentData?.tabSwitchCount > 3 &&
      !violations.some((v) => v.type === "MULTIPLE_WINDOWS")
    ) {
      violations.push({
        type: "EXCESSIVE_TAB_SWITCHING",
        severity: VIOLATION_SEVERITY.MEDIUM,
        message: `Excessive tab switching detected: ${environmentData.tabSwitchCount} switches`,
        timestamp: new Date(),
      });
    }

    // Check screen orientation (should be stable for desk setup)
    if (environmentData?.screenRotationChanges > 5) {
      violations.push({
        type: "SCREEN_ROTATION",
        severity: VIOLATION_SEVERITY.LOW,
        message: `Screen rotated ${environmentData.screenRotationChanges} times`,
        timestamp: new Date(),
      });
    }

    // Store validation result
    await recordProctorValidation(sessionId, userId, "environment", {
      isValid: violations.length === 0,
      violations,
      environmentData: sanitizeEnvironmentData(environmentData),
    });

    return {
      valid: violations.length === 0,
      violations,
    };
  } catch (error) {
    console.error("Environment validation error:", error);
    throw new Error(`Environment validation failed: ${error.message}`);
  }
}

/**
 * Validate participant during session
 * Called periodically during active session
 */
export async function validateParticipantDuringSession(sessionId, userId, telemetry) {
  try {
    const violations = [];

    // Get session data
    const sessionQuery = await db.collectionGroup("interview_buddy_sessions")
      .where(admin.firestore.FieldPath.documentId(), "==", sessionId)
      .limit(1)
      .get();

    if (sessionQuery.empty) {
      throw new Error("Session not found");
    }

    const sessionDoc = sessionQuery.docs[0];
    const sessionRef = sessionDoc.ref;
    const sessionData = sessionDoc.data();

    // Verify user is participant
    if (sessionData.createdBy !== userId && !sessionData.participants?.includes(userId)) {
      throw new Error("User is not a participant in this session");
    }

    // Validate camera continuity
    if (telemetry?.camera?.offlineCount > PROCTORING_RULES.camera.maxOfflineIncidents) {
      violations.push({
        type: "CAMERA_OFFLINE_LIMIT_EXCEEDED",
        severity: VIOLATION_SEVERITY.CRITICAL,
        count: telemetry.camera.offlineCount,
      });
    }

    // Validate audio continuity
    if (telemetry?.audio?.mutedDuration > 30000) {
      // 30 seconds
      violations.push({
        type: "AUDIO_MUTED_EXCESSIVE",
        severity: VIOLATION_SEVERITY.HIGH,
        duration: telemetry.audio.mutedDuration,
      });
    }

    // Validate input consistency
    if (!telemetry?.lastInputTime || Date.now() - telemetry.lastInputTime > 300000) {
      // 5 minutes
      violations.push({
        type: "NO_RECENT_INPUT",
        severity: VIOLATION_SEVERITY.MEDIUM,
        lastInput: telemetry?.lastInputTime,
      });
    }

    // Store continuous validation
    await recordProctorValidation(sessionId, userId, "continuous", {
      violations,
      telemetry: sanitizeTelemetry(telemetry),
      timestamp: new Date(),
    });

    // If critical violations, recommend session termination
    const criticalViolations = violations.filter(
      (v) => v.severity === VIOLATION_SEVERITY.CRITICAL
    );

    if (criticalViolations.length > 0) {
      await flagSessionForReview(sessionId, userId, criticalViolations);
    }

    return {
      valid: violations.length === 0,
      violations,
      recommendedAction: criticalViolations.length > 0 ? "TERMINATE" : "CONTINUE",
    };
  } catch (error) {
    console.error("Participant validation error:", error);
    throw new Error(`Participant validation failed: ${error.message}`);
  }
}

/**
 * Record proctoring validation in database
 */
async function recordProctorValidation(sessionId, userId, type, data) {
  try {
    const sessionQuery = await db.collectionGroup("interview_buddy_sessions")
      .where(admin.firestore.FieldPath.documentId(), "==", sessionId)
      .limit(1)
      .get();

    if (sessionQuery.empty) {
      throw new Error("Session not found");
    }

    const validationRef = sessionQuery.docs[0].ref
      .collection("proctoring_validations")
      .doc();

    await validationRef.set({
      type,
      userId,
      data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to record proctoring validation:", error);
  }
}

/**
 * Flag session for manual review
 */
async function flagSessionForReview(sessionId, userId, violations) {
  try {
    const reviewRef = db.collection("system").doc("proctoring_reviews").collection("reviews").doc();

    await reviewRef.set({
      sessionId,
      userId,
      violations,
      status: "pending",
      severity: "HIGH",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      notes: "Flagged for critical proctoring violations",
    });

    console.warn(`Session ${sessionId} flagged for review due to violations`);
  } catch (error) {
    console.error("Failed to flag session for review:", error);
  }
}

/**
 * Sanitize camera data for storage (remove sensitive data)
 */
function sanitizeCameraData(data) {
  const { isActive, width, height, frameRate, offlineDurationMs } = data;
  return { isActive, width, height, frameRate, offlineDurationMs };
}

/**
 * Sanitize audio data for storage
 */
function sanitizeAudioData(data) {
  const { isActive, audioTracks, sampleRate, permission } = data;
  return { isActive, audioTracks, sampleRate, permission };
}

/**
 * Sanitize environment data for storage
 */
function sanitizeEnvironmentData(data) {
  const { devToolsOpen, windowCount, tabSwitchCount, screenRotationChanges } = data;
  return { devToolsOpen, windowCount, tabSwitchCount, screenRotationChanges };
}

/**
 * Sanitize telemetry for storage
 */
function sanitizeTelemetry(data) {
  const { lastInputTime } = data;
  return { lastInputTime };
}

/**
 * Get proctoring report for a session
 */
export async function getProctoringReport(sessionId) {
  try {
    const sessionQuery = await db.collectionGroup("interview_buddy_sessions")
      .where(admin.firestore.FieldPath.documentId(), "==", sessionId)
      .limit(1)
      .get();

    if (sessionQuery.empty) {
      throw new Error("Session not found");
    }

    const validationsQuery = sessionQuery.docs[0].ref
      .collection("proctoring_validations");

    const validations = await validationsQuery.get();

    const report = {
      sessionId,
      validationCount: validations.size,
      violations: [],
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    };

    validations.forEach((doc) => {
      const data = doc.data();
      if (data.data?.violations) {
        data.data.violations.forEach((violation) => {
          report.violations.push(violation);
          if (violation.severity === VIOLATION_SEVERITY.CRITICAL) report.criticalCount++;
          else if (violation.severity === VIOLATION_SEVERITY.HIGH) report.highCount++;
          else if (violation.severity === VIOLATION_SEVERITY.MEDIUM) report.mediumCount++;
          else if (violation.severity === VIOLATION_SEVERITY.LOW) report.lowCount++;
        });
      }
    });

    report.verdict =
      report.criticalCount > 0 ? "FAIL" : report.highCount > 2 ? "REVIEW" : "PASS";

    return report;
  } catch (error) {
    console.error("Failed to get proctoring report:", error);
    throw new Error(`Failed to get proctoring report: ${error.message}`);
  }
}
