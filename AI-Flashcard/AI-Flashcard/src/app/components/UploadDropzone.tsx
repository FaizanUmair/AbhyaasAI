"use client";

import React, { useRef, useState } from "react";
import { FaCloudUploadAlt, FaFilePdf, FaImage, FaTimes, FaCheckCircle } from "react-icons/fa";

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
  description?: string;
}

export default function UploadDropzone({
  onFileSelect,
  accept = ".pdf, image/*",
  label = "Upload Source Material",
  description = "Support for PDF documents and Images with OCR"
}: UploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      onFileSelect(droppedFile);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      onFileSelect(selectedFile);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
      
      <div
        className={`relative group cursor-pointer h-32 rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center p-4 ${
          dragActive 
            ? "border-brand-500 bg-brand-50/50 dark:bg-brand-900/20" 
            : file 
              ? "border-emerald-400/60 bg-emerald-50/20 dark:bg-emerald-900/10" 
              : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-brand-400 hover:bg-brand-50/30 dark:hover:bg-brand-900/10"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          onChange={handleChange}
        />

        {file ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-200">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
              {file.type === "application/pdf" ? (
                <FaFilePdf className="text-xl text-red-500" />
              ) : (
                <FaImage className="text-xl text-brand-500" />
              )}
            </div>
            <div className="text-center">
              <p className="text-slate-700 dark:text-slate-200 text-xs font-semibold max-w-[180px] truncate">{file.name}</p>
              <p className="text-slate-400 text-[10px] mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors"
            >
              <FaTimes className="text-xs" />
            </button>
            <div className="absolute top-2 left-2 text-emerald-500">
                <FaCheckCircle className="text-sm" />
            </div>
          </div>
        ) : (
          <>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 transition-colors ${
              dragActive ? "bg-brand-500 text-white" : "bg-brand-50 dark:bg-brand-900/30 text-brand-500 group-hover:bg-brand-500 group-hover:text-white"
            }`}>
              <FaCloudUploadAlt className="text-lg" />
            </div>
            <div className="text-center">
              <p className="text-slate-600 dark:text-slate-300 text-xs font-semibold">Click to upload or drag & drop</p>
              <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-0.5">{description}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
