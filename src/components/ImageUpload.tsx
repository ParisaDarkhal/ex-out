'use client';

import { useCallback, useState } from 'react';
import { ImageData } from '@/utils/types';

interface ImageUploadProps {
  onImagesUploaded: (images: ImageData[]) => void;
  maxImages: number;
}

export default function ImageUpload({
  onImagesUploaded,
  maxImages,
}: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const validFiles = Array.from(files)
        .filter(
          (file) =>
            file.type.startsWith('image/') && file.size <= 15 * 1024 * 1024 // 15MB limit
        )
        .slice(0, maxImages);

      if (validFiles.length === 0) return;

      setUploading(true);

      try {
        const imagePromises = validFiles.map(
          async (file): Promise<ImageData> => {
            return new Promise((resolve) => {
              const img = new Image();
              img.onload = () => {
                resolve({
                  id: Math.random().toString(36).substr(2, 9),
                  file,
                  url: URL.createObjectURL(file),
                  width: img.width,
                  height: img.height,
                  faces: [], // Will be populated by face detection
                });
              };
              img.src = URL.createObjectURL(file);
            });
          }
        );

        const images = await Promise.all(imagePromises);
        onImagesUploaded(images);
      } catch (error) {
        console.error('Failed to process images:', error);
      } finally {
        setUploading(false);
      }
    },
    [maxImages, onImagesUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  return (
    <div className="mb-8">
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        {uploading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-lg">Processing images...</span>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Upload Photos
            </p>
            <p className="text-gray-600 mb-4">
              Drag & drop up to {maxImages} images, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Supports JPG, PNG, WebP • Max 15MB per image
            </p>
          </>
        )}

        <input
          id="file-input"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}
