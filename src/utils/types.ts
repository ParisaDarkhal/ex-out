export interface ImageData {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
  faces: FaceMatch[];
}

export interface FaceMatch {
  id: string;
  imageIndex: number;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  descriptor: Float32Array;
  confidence: number;
  selected: boolean;
  matchDistance?: number;
}

export type ProcessingStep =
  | 'idle'
  | 'segmenting'
  | 'inpainting'
  | 'complete'
  | 'error';

export interface DetectionResult {
  detection: {
    box: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    score: number;
  };
  descriptor: Float32Array;
}
