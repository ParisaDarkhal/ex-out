'use client';

import { useState, useRef, useEffect } from 'react';
import ImageUpload from '@/components/ImageUpload';
import FaceSelector from '@/components/FaceSelector';
import ProcessingStatus from '@/components/ProcessingStatus';
import ResultsDisplay from '@/components/ResultsDisplay';
import { loadModels } from '@/utils/faceDetection';
import { ImageData, FaceMatch, ProcessingStep } from '@/utils/types';

export default function Home() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedFace, setSelectedFace] = useState<FaceMatch | null>(null);
  const [matches, setMatches] = useState<FaceMatch[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [results, setResults] = useState<string[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    // Load face-api.js models on component mount
    const loadFaceModels = async () => {
      try {
        await loadModels();
        setModelsLoaded(true);
      } catch (error) {
        console.error('Failed to load face detection models:', error);
      }
    };

    loadFaceModels();
  }, []);

  const handleImagesUploaded = (uploadedImages: ImageData[]) => {
    setImages(uploadedImages);
    setSelectedFace(null);
    setMatches([]);
    setResults([]);
  };

  const handleFaceSelected = (face: FaceMatch, imageIndex: number) => {
    setSelectedFace(face);
    // Auto-match this face across other images will be handled in FaceSelector
  };

  const handleMatchesUpdated = (updatedMatches: FaceMatch[][]) => {
    setMatches(updatedMatches);
  };

  const handleProcess = async () => {
    if (!selectedFace || images.length === 0) return;

    setIsProcessing(true);
    setProcessingStep('segmenting');

    try {
      // Prepare form data for API call
      const formData = new FormData();

      // Add images and their matches
      images.forEach((image, index) => {
        formData.append(`images`, image.file);
        const imageMatches = matches[index] || [];
        formData.append(`matches_${index}`, JSON.stringify(imageMatches));
      });

      formData.append('selectedFace', JSON.stringify(selectedFace));

      setProcessingStep('inpainting');

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      const resultBlob = await response.blob();
      const resultUrl = URL.createObjectURL(resultBlob);

      setResults([resultUrl]);
      setProcessingStep('complete');
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetApp = () => {
    setImages([]);
    setSelectedFace(null);
    setMatches([]);
    setResults([]);
    setProcessingStep('idle');
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Ex-Out</h1>
          <p className="text-lg text-gray-600">
            Privacy-first photo person removal using AI
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Upload up to 3 photos, select a person to remove, and get
            photo-realistic results
          </p>
        </header>

        {!modelsLoaded && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-800">Loading AI models...</span>
            </div>
          </div>
        )}

        {processingStep === 'idle' && modelsLoaded && (
          <ImageUpload onImagesUploaded={handleImagesUploaded} maxImages={3} />
        )}

        {images.length > 0 &&
          !isProcessing &&
          processingStep !== 'complete' && (
            <FaceSelector
              images={images}
              selectedFace={selectedFace}
              matches={matches}
              onFaceSelected={handleFaceSelected}
              onMatchesUpdated={handleMatchesUpdated}
              onProcess={handleProcess}
            />
          )}

        {isProcessing && <ProcessingStatus step={processingStep} />}

        {results.length > 0 && processingStep === 'complete' && (
          <ResultsDisplay results={results} onReset={resetApp} />
        )}

        <footer className="mt-16 text-center text-sm text-gray-500">
          <p>
            🔒 All images are processed in-memory and immediately deleted for
            your privacy
          </p>
        </footer>
      </div>
    </div>
  );
}
