import React, { useState, useRef } from 'react';
import { ArrowDown, ArrowRight, X, Upload } from 'lucide-react';

interface FileItem {
  name: string;
  type: string;
  size: number;
  file: File;
}

const ClauseIQInterface: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = (): void => {
    if (message.trim()) {
      console.log('Sending message:', message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFiles = (fileList: FileList): void => {
    const newFiles: FileItem[] = Array.from(fileList).map(file => ({
      name: file.name,
      type: file.type || 'unknown',
      size: file.size,
      file: file
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  const removeFile = (index: number): void => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const openFileDialog = (): void => {
    fileInputRef.current?.click();
  };

  const handleSubmit = () => {

  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-light">
          Clause<span className="text-teal-400">IQ</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-medium text-teal-400 tracking-wide mb-6">FILE UPLOADER</h2>
          
          {isUploading && (
            <div className="bg-slate-900 border border-slate-600 rounded-lg p-8 text-center mb-6">
              <div className="flex flex-col items-center space-y-4">
                <Upload className="w-12 h-12 text-teal-400 animate-pulse" />
                <div className="space-y-2">
                  <p className="text-slate-300">Processing files...</p>
                  <div className="w-64 h-2 bg-slate-700 rounded-full mx-auto">
                    <div 
                      className="h-2 bg-teal-400 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-slate-400 text-sm">{uploadProgress}% complete</p>
                </div>
              </div>
            </div>
          )}

          {files.length === 0 && !isUploading && (
            <div 
              className={`bg-slate-900 border-2 border-dashed rounded-lg p-12 text-center mb-6 transition-all duration-200 cursor-pointer ${
                dragOver 
                  ? 'border-teal-400 bg-slate-800 scale-105' 
                  : 'border-slate-600 hover:border-teal-500 hover:bg-slate-850'
              }`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={openFileDialog}
            >
              <div className="flex flex-col items-center space-y-4">
                <ArrowDown className={`w-16 h-16 transition-colors ${dragOver ? 'text-teal-400' : 'text-slate-500'}`} />
                <div className="space-y-2">
                  <p className="text-slate-300 text-lg font-medium">
                    {dragOver ? 'Drop files here' : 'Drop files here to upload'}
                  </p>
                  <p className="text-slate-500 text-sm">or click to browse files</p>
                  <p className="text-slate-600 text-xs">Supports PDF, DOCX, TXT, and more</p>
                </div>
              </div>
            </div>
          )}

          {files.length > 0 && !isUploading && (
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">{files.length} file(s) uploaded</p>
                <button
                  onClick={() => setFiles([])}
                  className="text-red-400 hover:text-red-300 text-xs transition-colors"
                >
                  Clear all
                </button>
              </div>
              {files.map((file: FileItem, index: number) => (
                <div key={index} className="flex items-center justify-between bg-slate-900 border border-slate-600 rounded-lg p-3 hover:border-slate-500 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-teal-400 rounded-full flex-shrink-0"></div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-slate-300 font-mono text-sm truncate">{file.name}</span>
                      <span className="text-slate-500 text-xs">{formatFileSize(file.size)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    title="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {files.length > 0 && !isUploading && (
             <button
                onSubmit={handleSubmit}
                onClick={handleSubmit}
                className="w-full bg-teal-400 hover:bg-teal-500 text-slate-900 py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Upload Files
              </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt,.eml,.png,.jpg,.jpeg"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 flex flex-col">
          <h2 className="text-xl font-medium text-teal-400 tracking-wide mb-6">CHAT INTERFACE</h2>
          
          <div className="flex-1 space-y-4 mb-6 max-h-96 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-600 rounded-lg p-4">
              <p className="text-slate-200">
                46-year-old male, knee surgery in Pune, 3-month-old insurance policy
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-600 rounded-lg p-4">
              <p className="text-slate-200">
                Yes, knee surgery is covered under the policy
              </p>
            </div>
          </div>

          <div className="flex space-x-3">
            <input
              type="text"
              value={message}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-colors"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim()}
              className="bg-teal-400 hover:bg-teal-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 px-4 py-3 rounded-lg transition-colors flex items-center justify-center"
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