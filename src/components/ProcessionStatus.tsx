'use client';

import { ProcessingStep } from '@/utils/types';

interface ProcessingStatusProps {
  step: ProcessingStep;
}

const stepInfo = {
  idle: { label: 'Ready', description: 'Waiting for input' },
  segmenting: {
    label: 'Segmenting Bodies',
    description: 'Creating precise masks for each person...',
  },
  inpainting: {
    label: 'AI Inpainting',
    description: 'Generating photo-realistic backgrounds...',
  },
  complete: { label: 'Complete', description: 'Your photos are ready!' },
  error: {
    label: 'Error',
    description: 'Something went wrong. Please try again.',
  },
};

export default function ProcessingStatus({ step }: ProcessingStatusProps) {
  const currentStep = stepInfo[step];
  const isError = step === 'error';

  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto">
        {!isError && (
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
        )}

        {isError && (
          <div className="bg-red-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-6">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        )}

        <h2
          className={`text-2xl font-bold mb-2 ${
            isError ? 'text-red-600' : 'text-gray-900'
          }`}
        >
          {currentStep.label}
        </h2>

        <p className={`text-lg ${isError ? 'text-red-500' : 'text-gray-600'}`}>
          {currentStep.description}
        </p>

        {step === 'inpainting' && (
          <div className="mt-4 text-sm text-gray-500">
            <p>This may take 10-30 seconds depending on image complexity...</p>
          </div>
        )}

        {step === 'segmenting' && (
          <div className="mt-6">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full animate-pulse"
                style={{ width: '40%' }}
              ></div>
            </div>
          </div>
        )}

        {step === 'inpainting' && (
          <div className="mt-6">
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full animate-pulse"
                style={{ width: '80%' }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
