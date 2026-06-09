'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn, formatFileSize, truncateFilename, ALLOWED_FILE_TYPES } from '@/lib/utils';

export interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress?: number;
  error?: string;
  // Returned from server after upload
  url?: string;
  storage_path?: string;
}

interface FileUploadZoneProps {
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMb?: number;
  disabled?: boolean;
}

const MAX_DEFAULT_MB = 50;

export function FileUploadZone({
  files,
  onFilesChange,
  maxFiles = 10,
  maxSizeMb = MAX_DEFAULT_MB,
  disabled = false,
}: FileUploadZoneProps) {
  const [dragError, setDragError] = useState('');

  const onDrop = useCallback(
    (accepted: File[], rejected: any[]) => {
      setDragError('');

      if (rejected.length > 0) {
        const err = rejected[0].errors[0];
        if (err.code === 'file-too-large') {
          setDragError(`File too large. Max size is ${maxSizeMb}MB.`);
        } else if (err.code === 'file-invalid-type') {
          setDragError('Invalid file type. Please upload PDF, JPG, PNG, or TIFF files.');
        } else {
          setDragError(err.message);
        }
        return;
      }

      if (files.length + accepted.length > maxFiles) {
        setDragError(`Maximum ${maxFiles} files allowed.`);
        return;
      }

      const newFiles: UploadedFile[] = accepted.map(file => ({
        file,
        id: Math.random().toString(36).slice(2),
        status: 'pending',
        progress: 0,
      }));

      onFilesChange([...files, ...newFiles]);
    },
    [files, maxFiles, maxSizeMb, onFilesChange]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/tiff': ['.tif', '.tiff'],
      'application/postscript': ['.ps'],
    },
    maxSize: maxSizeMb * 1024 * 1024,
    disabled,
    multiple: true,
  });

  const removeFile = (id: string) => {
    onFilesChange(files.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer',
          'transition-all duration-200',
          isDragActive && !isDragReject && 'border-navy-500 bg-navy-50 scale-[1.01]',
          isDragReject && 'border-red-400 bg-red-50',
          !isDragActive && 'border-stone-300 hover:border-navy-400 hover:bg-stone-50',
          disabled && 'opacity-50 cursor-not-allowed hover:border-stone-300 hover:bg-transparent',
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center transition-colors',
            isDragActive && !isDragReject ? 'bg-navy-100' : 'bg-stone-100',
          )}>
            <Upload className={cn(
              'w-6 h-6 transition-colors',
              isDragActive && !isDragReject ? 'text-navy-600' : 'text-stone-400',
            )} />
          </div>

          <div>
            <p className="font-medium text-stone-700">
              {isDragActive && !isDragReject
                ? 'Drop your files here'
                : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-stone-500 mt-1">
              or <span className="text-navy-600 font-medium underline underline-offset-2">browse to upload</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {['PDF', 'JPG', 'PNG', 'TIFF'].map(ext => (
              <span key={ext} className="badge bg-stone-100 border-stone-200 text-stone-500 text-xs">
                .{ext.toLowerCase()}
              </span>
            ))}
          </div>

          <p className="text-xs text-stone-400">
            Up to {maxFiles} files · Max {maxSizeMb}MB each
          </p>
        </div>
      </div>

      {/* Drag error */}
      {dragError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {dragError}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(f => (
            <FileRow key={f.id} file={f} onRemove={() => removeFile(f.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileRow({ file, onRemove }: { file: UploadedFile; onRemove: () => void }) {
  const isPDF = file.file.type === 'application/pdf';
  const isImage = file.file.type.startsWith('image/');

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl border px-4 py-3 bg-white',
      file.status === 'error'   && 'border-red-200 bg-red-50',
      file.status === 'done'    && 'border-emerald-200 bg-emerald-50',
      file.status === 'pending' && 'border-stone-200',
      file.status === 'uploading' && 'border-navy-200',
    )}>
      {/* Icon */}
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
        isPDF ? 'bg-red-100' : isImage ? 'bg-blue-100' : 'bg-stone-100',
      )}>
        <FileText className={cn(
          'w-4 h-4',
          isPDF ? 'text-red-600' : isImage ? 'text-blue-600' : 'text-stone-500',
        )} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 truncate">
          {truncateFilename(file.file.name)}
        </p>
        <p className="text-xs text-stone-400 mt-0.5">
          {formatFileSize(file.file.size)}
          {file.status === 'uploading' && file.progress !== undefined && (
            <> · {file.progress}% uploaded</>
          )}
          {file.status === 'error' && (
            <span className="text-red-500"> · {file.error ?? 'Upload failed'}</span>
          )}
        </p>

        {/* Progress bar */}
        {file.status === 'uploading' && (
          <div className="mt-1.5 h-1 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-navy-600 rounded-full transition-all duration-300"
              style={{ width: `${file.progress ?? 0}%` }}
            />
          </div>
        )}
      </div>

      {/* Status icon / remove */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {file.status === 'done' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
        {file.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
        {(file.status === 'pending' || file.status === 'error') && (
          <button
            type="button"
            onClick={onRemove}
            className="w-6 h-6 rounded-full hover:bg-stone-200 flex items-center justify-center transition-colors text-stone-400 hover:text-stone-700"
            aria-label="Remove file"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
