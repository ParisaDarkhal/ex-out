'use client';

import { useEffect, useState, useRef } from 'react';
import {
  detectFaces,
  computeFaceDescriptor,
  compareFaces,
} from '@/utils/faceDetection';
import { ImageData, FaceMatch } from '@/utils/types';

interface FaceSelectorProps {
  images: ImageData[];
  selectedFace: FaceMatch | null;
  matches: FaceMatch[][];
  onFaceSelected: (face: FaceMatch, imageIndex: number) => void;
  onMatchesUpdated: (matches: FaceMatch[][]) => void;
  onProcess: () => void;
}

export default function FaceSelector({
  images,
  selectedFace,
  matches,
  onFaceSelected,
  onMatchesUpdated,
  onProcess,
}: FaceSelectorProps) {
  const [loading, setLoading] = useState(true);
  const [allFaces, setAllFaces] = useState<FaceMatch[][]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  // Detect faces in all images
  useEffect(() => {
    const detectAllFaces = async () => {
      setLoading(true);
      try {
        const facePromises = images.map(async (image, index) => {
          const detections = await detectFaces(image.url);
          return detections.map(
            (detection, faceIndex): FaceMatch => ({
              id: `${index}-${faceIndex}`,
              imageIndex: index,
              boundingBox: detection.detection.box,
              descriptor: detection.descriptor,
              confidence: detection.detection.score,
              selected: false,
            })
          );
        });

        const faces = await Promise.all(facePromises);
        setAllFaces(faces);
        onMatchesUpdated(faces);
      } catch (error) {
        console.error('Face detection failed:', error);
      } finally {
        setLoading(false);
      }
    };

    if (images.length > 0) {
      detectAllFaces();
    }
  }, [images, onMatchesUpdated]);

  // Auto-match faces when a face is selected
  useEffect(() => {
    if (!selectedFace || allFaces.length === 0) return;

    const updatedMatches = allFaces.map((imageFaces, imageIndex) => {
      if (imageIndex === selectedFace.imageIndex) {
        // Mark the selected face
        return imageFaces.map((face) => ({
          ...face,
          selected: face.id === selectedFace.id,
        }));
      } else {
        // Find matches in other images
        return imageFaces.map((face) => {
          const distance = compareFaces(
            selectedFace.descriptor,
            face.descriptor
          );
          const isMatch = distance < 0.6; // Matching threshold
          return {
            ...face,
            selected: isMatch,
            matchDistance: distance,
          };
        });
      }
    });

    setAllFaces(updatedMatches);
    onMatchesUpdated(updatedMatches);
  }, [selectedFace, onMatchesUpdated]);

  const handleFaceClick = (face: FaceMatch, imageIndex: number) => {
    onFaceSelected(face, imageIndex);
  };

  const toggleMatch = (faceId: string, imageIndex: number) => {
    const updatedMatches = [...allFaces];
    const faceIndex = updatedMatches[imageIndex].findIndex(
      (f) => f.id === faceId
    );
    if (faceIndex !== -1) {
      updatedMatches[imageIndex][faceIndex] = {
        ...updatedMatches[imageIndex][faceIndex],
        selected: !updatedMatches[imageIndex][faceIndex].selected,
      };
      setAllFaces(updatedMatches);
      onMatchesUpdated(updatedMatches);
    }
  };

  const renderImage = (image: ImageData, index: number) => {
    const imageFaces = allFaces[index] || [];

    return (
      <div key={image.id} className="relative">
        <div className="relative inline-block">
          <img
            src={image.url}
            alt={`Upload ${index + 1}`}
            className="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
            onLoad={(e) => {
              // Update canvas for face overlays if needed
              const canvas = canvasRefs.current[index];
              const img = e.target as HTMLImageElement;
              if (canvas) {
                canvas.width = img.width;
                canvas.height = img.height;
              }
            }}
          />

          {/* Face bounding boxes */}
          {imageFaces.map((face) => {
            const scaleX = (face.boundingBox.width / image.width) * 100;
            const scaleY = (face.boundingBox.height / image.height) * 100;
            const leftPercent = (face.boundingBox.x / image.width) * 100;
            const topPercent = (face.boundingBox.y / image.height) * 100;

            let boxClass = 'face-box';
            if (selectedFace && face.id === selectedFace.id) {
              boxClass += ' selected';
            } else if (face.selected) {
              boxClass += ' matched';
            }

            return (
              <div
                key={face.id}
                className={boxClass}
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  width: `${scaleX}%`,
                  height: `${scaleY}%`,
                }}
                onClick={() => {
                  if (!selectedFace) {
                    handleFaceClick(face, index);
                  } else {
                    toggleMatch(face.id, index);
                  }
                }}
              >
                <div className="absolute -top-6 left-0 text-xs bg-black text-white px-1 rounded">
                  {face.confidence.toFixed(2)}
                  {face.matchDistance && ` (${face.matchDistance.toFixed(2)})`}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-2 text-sm text-gray-600">
          Image {index + 1} • {imageFaces.length} face(s) detected
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg font-medium">Detecting faces...</p>
      </div>
    );
  }

  const selectedMatches = allFaces.reduce(
    (count, imageFaces) => count + imageFaces.filter((f) => f.selected).length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Select Person to Remove</h2>

        {!selectedFace ? (
          <p className="text-gray-600 mb-4">
            Click on any face in the photos below to select the person you want
            to remove.
          </p>
        ) : (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">
              ✓ Person selected! Found {selectedMatches} matching face(s) across
              all images.
            </p>
            <p className="text-sm text-green-600 mt-1">
              Review the highlighted faces below. Click to toggle matches
              on/off.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image, index) => renderImage(image, index))}
        </div>

        {selectedFace && selectedMatches > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={onProcess}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
            >
              Remove Person from {selectedMatches} Photo
              {selectedMatches > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
