"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  X, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  Maximize2,
  FileCheck,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Format bytes to readable string (e.g. 1.2 MB, 450 KB)
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Check if a file is an image
 */
function isImageFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith("image/")) return true;
  const ext = file.name ? file.name.split(".").pop().toLowerCase() : "";
  return ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext);
}

/**
 * Modern High-End File Upload Dropzone
 * Features:
 * - Smooth Drag & Drop with active drag state styling
 * - Live Image Preview with expand/zoom modal
 * - Rich Document Preview card with metadata & file-type badges
 * - In-flight uploading & processing progress indicator
 * - Error state with interactive "Retry Upload" and "Change File" actions
 */
export default function FileUploadDropzone({
  file,
  onFileSelect,
  onFileRemove,
  accept = ".pdf,.txt,.png,.jpg,.jpeg",
  maxSizeMB = 15,
  isUploading = false,
  uploadProgress = null,
  uploadStage = "",
  error = null,
  onRetry = null,
  title = "Drop your resume or document here",
  subtitle = "or click to browse from your device",
  acceptedBadges = ["PDF", "TXT", "PNG", "JPG"],
  className = "",
  disabled = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [internalError, setInternalError] = useState(null);

  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  // Generate and cleanup object URL for previewing image files
  useEffect(() => {
    if (file && isImageFile(file)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

  // Combined error (either passed from parent API or client validation)
  const activeError = error || internalError;

  // Handle client-side file selection & validation
  const validateAndSelectFile = useCallback((selectedFile) => {
    setInternalError(null);
    if (!selectedFile) return;

    // Check size limit
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setInternalError(`File size exceeds ${maxSizeMB}MB limit (${formatFileSize(selectedFile.size)}).`);
      return;
    }

    // Check extension if accept provided
    if (accept && accept !== "*") {
      const allowedExtensions = accept
        .split(",")
        .map((s) => s.trim().toLowerCase().replace(".", ""));
      const fileExt = selectedFile.name ? selectedFile.name.split(".").pop().toLowerCase() : "";
      
      const isAllowedExt = allowedExtensions.includes(fileExt);
      const isAllowedMime = selectedFile.type && accept.split(",").some((acc) => {
        const clean = acc.trim();
        return clean.includes("/") && selectedFile.type.match(new RegExp(clean.replace("*", ".*")));
      });

      if (!isAllowedExt && !isAllowedMime) {
        setInternalError(`Unsupported file format. Please upload ${acceptedBadges.join(", ")} files.`);
        return;
      }
    }

    if (onFileSelect) {
      onFileSelect(selectedFile);
    }
  }, [accept, acceptedBadges, maxSizeMB, onFileSelect]);

  // Drag and drop event handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSelectFile(droppedFile);
    }
  };

  const handleInputChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      validateAndSelectFile(selected);
    }
    // reset input so selecting the same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerSelect = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleRemove = (e) => {
    e?.stopPropagation();
    setInternalError(null);
    if (onFileRemove) {
      onFileRemove();
    }
  };

  const handleRetry = (e) => {
    e?.stopPropagation();
    setInternalError(null);
    if (onRetry) {
      onRetry();
    } else if (file) {
      validateAndSelectFile(file);
    }
  };

  // Determine file type category & color
  const getFileCategory = () => {
    if (!file) return { label: "FILE", color: "bg-slate-500", text: "text-slate-500" };
    const ext = file.name ? file.name.split(".").pop().toUpperCase() : "";
    if (ext === "PDF") return { label: "PDF", color: "bg-rose-500/10 border-rose-500/30 text-rose-500", dot: "bg-rose-500" };
    if (["PNG", "JPG", "JPEG", "WEBP"].includes(ext)) {
      return { label: ext, color: "bg-indigo-500/10 border-indigo-500/30 text-indigo-500", dot: "bg-indigo-500" };
    }
    return { label: ext || "TXT", color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-500", dot: "bg-cyan-500" };
  };

  const fileCategory = getFileCategory();

  return (
    <div className={cn("w-full relative group transition-all duration-300", className)}>
      {/* Hidden native input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept={accept}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* STATE 1: ERROR STATE WITH INTERACTIVE RETRY */}
      {activeError && (
        <div className="rounded-2xl border-2 border-rose-500/40 bg-gradient-to-b from-rose-500/10 to-rose-500/5 p-6 backdrop-blur-md shadow-lg shadow-rose-500/5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-500 shrink-0 mt-0.5 sm:mt-0 animate-pulse">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  Upload or Processing Error
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md leading-relaxed">
                  {activeError}
                </p>
                {file && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                    Failed file: {file.name} ({formatFileSize(file.size)})
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {onRetry && (
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isUploading}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 shadow-md shadow-rose-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isUploading && "animate-spin")} />
                  Retry
                </button>
              )}
              <button
                type="button"
                onClick={triggerSelect}
                disabled={isUploading}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition"
              >
                Choose Another
              </button>
              <button
                type="button"
                onClick={handleRemove}
                title="Dismiss"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE 2: ACTIVE FILE PREVIEW (DOCUMENT OR IMAGE) */}
      {!activeError && file && (
        <div className="rounded-2xl border-2 border-cyan-500/40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-lg shadow-cyan-500/5 transition-all duration-300">
          {previewUrl ? (
            /* IMAGE PREVIEW CARD */
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div 
                onClick={() => setImageModalOpen(true)}
                className="relative group/thumb w-full sm:w-28 h-28 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 cursor-pointer shrink-0 flex items-center justify-center"
              >
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-105"
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                  <Maximize2 className="w-5 h-5 drop-shadow" />
                </div>
              </div>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider", fileCategory.color)}>
                    {fileCategory.label}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for ATS Analysis
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatFileSize(file.size)} • Image Preview Active
                </p>

                {/* Progress bar if currently uploading/processing */}
                {isUploading && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-cyan-600 dark:text-cyan-400 mb-1 font-medium">
                      <span>{uploadStage || "Processing document..."}</span>
                      <span>{uploadProgress ? `${uploadProgress}%` : ""}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300 animate-pulse"
                        style={{ width: uploadProgress ? `${uploadProgress}%` : "100%" }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setImageModalOpen(true)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="View full image"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={triggerSelect}
                  disabled={isUploading}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isUploading}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-500/10 transition"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* DOCUMENT PREVIEW CARD (PDF, TXT, DOCX) */
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/15 to-indigo-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider", fileCategory.color)}>
                      {fileCategory.label}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <FileCheck className="w-3.5 h-3.5" /> File Selected & Validated
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {formatFileSize(file.size)}
                  </p>

                  {/* Progress bar if uploading/processing */}
                  {isUploading && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-cyan-600 dark:text-cyan-400 mb-1 font-medium">
                        <span>{uploadStage || "Processing resume..."}</span>
                        <span>{uploadProgress ? `${uploadProgress}%` : ""}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-300 animate-pulse"
                          style={{ width: uploadProgress ? `${uploadProgress}%` : "100%" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                <button
                  type="button"
                  onClick={triggerSelect}
                  disabled={isUploading}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Change File
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isUploading}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-rose-500 hover:bg-rose-500/10 transition"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STATE 3: EMPTY DROPZONE (DRAG & DROP ACTIVE OR IDLE) */}
      {!activeError && !file && (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerSelect();
            }
          }}
          className={cn(
            "relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer p-8 sm:p-10 text-center select-none outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
            isDragging
              ? "border-cyan-500 bg-cyan-500/15 scale-[1.01] shadow-xl shadow-cyan-500/20 ring-4 ring-cyan-500/20"
              : "border-cyan-500/30 hover:border-cyan-500/60 bg-gradient-to-b from-cyan-500/5 to-transparent hover:bg-cyan-500/10 shadow-sm",
            disabled && "opacity-50 cursor-not-allowed hover:border-cyan-500/30 hover:bg-transparent"
          )}
        >
          {/* Ambient background glow when dragging */}
          {isDragging && (
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-indigo-500/20 to-cyan-500/20 rounded-2xl animate-pulse pointer-events-none" />
          )}

          <div className="relative z-10 flex flex-col items-center">
            {/* Animated Upload Icon */}
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
                isDragging
                  ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/40 scale-110 -translate-y-1"
                  : "bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/20"
              )}
            >
              <Upload className={cn("w-7 h-7 transition-transform duration-300", isDragging && "animate-bounce")} />
            </div>

            {/* Title & Subtitle */}
            <p className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
              {isDragging ? "Release to drop your file here" : title}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
              {isDragging ? "We'll parse and prepare it instantly" : subtitle}
            </p>

            {/* Accepted Format Badges */}
            <div className="flex gap-2 justify-center flex-wrap items-center">
              {acceptedBadges.map((badge) => (
                <span
                  key={badge}
                  className="px-2.5 py-1 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-md text-[11px] font-semibold text-slate-600 dark:text-slate-300 shadow-xs"
                >
                  {badge}
                </span>
              ))}
              <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-1">
                (Up to {maxSizeMB}MB)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN / LIGHTBOX IMAGE MODAL */}
      {imageModalOpen && previewUrl && (
        <div 
          onClick={() => setImageModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white truncate max-w-xs">{file?.name}</span>
                <span className="text-xs text-slate-400">({formatFileSize(file?.size)})</span>
              </div>
              <button
                type="button"
                onClick={() => setImageModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center min-h-[300px] bg-slate-950/60">
              <img
                src={previewUrl}
                alt={file?.name || "Uploaded Preview"}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
