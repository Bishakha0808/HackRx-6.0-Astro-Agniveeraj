"use client";
import React, { useState, useRef, useEffect } from "react";
import { ArrowDown, ArrowRight, X, Upload } from "lucide-react";
import { io } from "socket.io-client";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const socket = io("http://localhost:5000");

const ClauseIQInterface = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleReceiveMessage = (msg) => {
      setMessages((prev) => {
        const alreadyExists = prev.some(
          (m) => m.text === msg.text && m.sender === msg.sender
        );
        return alreadyExists ? prev : [...prev, msg];
      });
    };

    socket.off("receive_message", handleReceiveMessage);
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, []);

  const handleSend = () => {
    if (!message.trim()) return;
    const msg = { text: message, sender: "user" };
    socket.emit("send_message", msg);
    setMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const processFiles = (fileList) => {
    const newFiles = Array.from(fileList).map((file) => ({
      name: file.name,
      type: file.type || "unknown",
      size: file.size,
      file: file,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files?.length > 0) processFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles?.length > 0) processFiles(droppedFiles);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      files.forEach((fileItem) => formData.append("pdfs", fileItem.file));

      setIsUploading(true);
      setUploadProgress(0);
      setTimeLeft(null);

      const xhr = new XMLHttpRequest();
      const startTime = Date.now();

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);

          const elapsed = (Date.now() - startTime) / 1000;
          const speed = event.loaded / elapsed;
          const remaining = (event.total - event.loaded) / speed;
          setTimeLeft(Math.max(0, Math.round(remaining)));
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        setTimeLeft(null);
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          toast.success(`Uploaded ${response.files.length} file(s) successfully ✅`);
          setUploadedFiles((prev) => [...prev, ...response.files]);
        } else {
          toast.error("Upload failed ❌");
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        setTimeLeft(null);
        toast.error("Upload failed ❌");
      };

      xhr.open("POST", "http://localhost:5000/api/pdf/upload", true);
      xhr.send(formData);
      setFiles([]);
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <ToastContainer position="top-right" />

      <div className="mb-8">
        <h1 className="text-4xl font-serif m-4 font-semibold">
          Clause<span className="text-teal-400">IQ</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 max-w-7xl mx-auto">
        
        {/* FILE UPLOAD SECTION */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-medium text-teal-400 tracking-wide mb-6">
            FILE UPLOADER
          </h2>

          {isUploading && (
            <div className="bg-slate-900 border border-slate-600 rounded-lg p-8 text-center mb-6">
              <Upload className="w-12 h-12 text-teal-400 animate-pulse mx-auto" />
              <p className="text-slate-300">Uploading...</p>
              <div className="w-64 h-2 bg-slate-700 rounded-full mx-auto">
                <div
                  className="h-2 bg-teal-400 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-slate-400 text-sm">
                {uploadProgress}% complete {timeLeft !== null && `(Time left: ${timeLeft}s)`}
              </p>
            </div>
          )}

          {files.length === 0 && !isUploading && (
           <div
  className={`bg-slate-900 border-2 border-dashed rounded-lg p-12 text-center mb-6 cursor-pointer 
    ${dragOver ? "border-teal-400 bg-slate-800 scale-105" : "border-slate-600"}`}
  onDragOver={handleDragOver}
  onDragEnter={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  onClick={openFileDialog}
>
  <div className="flex flex-col items-center space-y-3">
    <ArrowDown className={`w-16 h-16 ${dragOver ? "text-teal-400" : "text-slate-500"}`} />
    <p className="text-slate-300 text-lg font-medium">
      {dragOver ? "Drop files here" : "Drop files here to upload"}
    </p>
    <p className="text-slate-500 text-sm">or click to browse files</p>
    <p className="text-slate-600 text-xs">Supports PDF, DOCX, TXT, and more</p>
  </div>
</div>

          )}

          {files.length > 0 && !isUploading && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-sm">{files.length} file(s) selected</p>
                <button onClick={() => setFiles([])} className="text-red-400 text-xs">
                  Clear all
                </button>
              </div>
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-slate-900 border border-slate-600 rounded-lg p-3 mb-2">
                  <div>
                    <span className="text-slate-300 font-mono text-sm">{file.name}</span>
                    <span className="text-slate-500 text-xs"> ({formatFileSize(file.size)})</span>
                  </div>
                  <button onClick={() => removeFile(index)} className="text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleSubmit}
                className="w-full bg-teal-400 hover:bg-teal-500 text-slate-900 py-3 px-4 rounded-lg font-medium"
              >
                Upload Files
              </button>
              <button
                onClick={openFileDialog}
                className="mt-3 w-full bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg border border-slate-500"
              >
                ➕ Add More PDFs
              </button>
            </>
          )}
          MONGODB_URI=mongodb+srv://archishaw2004:A9MiJ4uKWIIWWoIl@cluster0.gr40a4l.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
CLOUDINARY_CLOUD_NAME=dm9j97lv3
CLOUDINARY_API_KEY=721618672112387
CLOUDINARY_API_SECRET=u1T4RnvRZDP_nSwI5ShQrX1PEd0




          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.eml"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        {/* CHAT SECTION */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 flex flex-col">
          <h2 className="text-xl font-medium text-teal-400 tracking-wide mb-6">
            CHAT WITH CLAUSEIQ
          </h2>

          <div className="flex-1 space-y-4 mb-6 max-h-96 overflow-y-auto pr-4">
            {uploadedFiles.map((file, index) => (
              <div key={`file-${index}`} className="bg-slate-700 border border-slate-600 rounded-lg p-3">
                <p className="text-slate-200 font-semibold">📄 {file.name}</p>
                <p className="text-slate-400 text-xs">
                  Size: {formatFileSize(file.size)} | Type: {file.type}
                </p>
              </div>
            ))}

            {messages.map((m, i) => (
              <div
                key={`msg-${i}`}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <span className="text-xs text-slate-400 mb-1">
                  {m.sender === "user" ? "User" : "Bot"}
                </span>
                <div
                  className={`p-3 rounded-lg border max-w-[60%] ${
                    m.sender === "user"
                      ? "bg-teal-600 border-teal-700 text-white"
                      : "bg-slate-700 border-slate-600 text-white"
                  }`}
                >
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex space-x-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-200"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="bg-teal-400 hover:bg-teal-500 disabled:bg-slate-600 text-slate-900 px-4 py-3 rounded-lg"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClauseIQInterface;
