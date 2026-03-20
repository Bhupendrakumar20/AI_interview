"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, Eye, Mic, AlertTriangle, CheckCircle } from "lucide-react";

export default function ProctoringMonitor() {
  const videoRef = useRef(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [proctorReport, setProctoringReport] = useState(null);
  const [integrityScore, setIntegrityScore] = useState(100);
  const [flags, setFlags] = useState({
    multipleFaces: false,
    eyeTracking: false,
    multipleVoices: false,
    copyPaste: false,
    tabSwitching: false,
  });

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsMonitoring(true);
      }
    } catch (error) {
      console.error("Failed to access camera/mic:", error);
      alert("Please grant camera and microphone permissions");
    }
  };

  const stopMonitoring = async () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      setIsMonitoring(false);
    }
  };

  const submitForAnalysis = async () => {
    try {
      // Collect proctoring data
      const proctorData = {
        faceDetectionData: { detectedFaces: flags.multipleFaces ? 2 : 1 },
        eyeTrackingData: { lookingAwayDuration: flags.eyeTracking ? 6000 : 0 },
        audioAnalysisData: {
          detectedVoices: flags.multipleVoices ? 2 : 1,
        },
        screenActivityData: {
          detectedObjects: [],
          rapidMouseMovement: false,
        },
        clipboardData: { pasteEvents: flags.copyPaste ? 3 : 0 },
        tabSwitchData: { tabSwitches: flags.tabSwitching ? 5 : 0 },
        sessionId: "session_" + Date.now(),
        candidateId: "candidate_1",
      };

      const response = await fetch("/api/proctoring/analyze-behavior", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proctorData),
      });

      const report = await response.json();
      setProctoringReport(report);
      setIntegrityScore(report.integrityScore);
    } catch (error) {
      console.error("Analysis failed:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Camera className="w-6 h-6" />
        AI Proctoring Monitor
      </h2>

      {/* Video Feed */}
      <div className="mb-6 bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-96 object-cover"
        />
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={startMonitoring}
          disabled={isMonitoring}
          className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
        >
          {isMonitoring ? "Monitoring..." : "Start Monitoring"}
        </button>
        <button
          onClick={stopMonitoring}
          disabled={!isMonitoring}
          className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400"
        >
          Stop Monitoring
        </button>
      </div>

      {/* Integrity Score */}
      {proctorReport && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="text-center mb-4">
            <p className="text-gray-600 text-sm">Integrity Score</p>
            <p className={`text-4xl font-bold ${integrityScore >= 80 ? "text-green-600" : integrityScore >= 60 ? "text-yellow-600" : "text-red-600"}`}>
              {proctorReport.integrityScore}%
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Status: <span className="font-bold">{proctorReport.verdict}</span>
            </p>
          </div>

          {/* Flags */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(proctorReport.proctorFlags).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                {value ? (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <span className="capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Button */}
      <button
        onClick={submitForAnalysis}
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 mb-4"
      >
        Analyze Behavior
      </button>

      {/* Report */}
      {proctorReport?.aiAnalysis && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-bold mb-3">Analysis Report</h3>
          {proctorReport.aiAnalysis.fallbackAnalysis ? (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Risk Assessment:</strong>{" "}
                {proctorReport.aiAnalysis.riskAssessment}
              </p>
              <p>
                <strong>Recommended Actions:</strong>{" "}
                {proctorReport.aiAnalysis.recommendedActions}
              </p>
            </div>
          ) : (
            <pre className="bg-white p-3 rounded text-xs overflow-auto">
              {JSON.stringify(proctorReport.aiAnalysis, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
