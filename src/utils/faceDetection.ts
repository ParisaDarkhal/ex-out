import * as faceapi from 'face-api.js';

let modelsLoaded = false;

export const loadModels = async (): Promise<void> => {
  if (modelsLoaded) return;

  // Load models from public/models directory
  await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

  modelsLoaded = true;
};

export const detectFaces = async (imageUrl: string) => {
  if (!modelsLoaded) {
    throw new Error('Face detection models not loaded');
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';

  return new Promise<any[]>((resolve, reject) => {
    img.onload = async () => {
      try {
        // Detect faces with landmarks and descriptors
        const detections = await faceapi
          .detectAllFaces(
            img,
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
          )
          .withFaceLandmarks()
          .withFaceDescriptors();

        const results = detections.map((detection) => ({
          detection: {
            box: {
              x: detection.detection.box.x,
              y: detection.detection.box.y,
              width: detection.detection.box.width,
              height: detection.detection.box.height,
            },
            score: detection.detection.score,
          },
          descriptor: detection.descriptor,
        }));

        resolve(results);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = reject;
    img.src = imageUrl;
  });
};

export const computeFaceDescriptor = async (
  imageUrl: string,
  boundingBox: any
): Promise<Float32Array> => {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  return new Promise((resolve, reject) => {
    img.onload = async () => {
      try {
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.SsdMobilenetv1Options())
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          resolve(detection.descriptor);
        } else {
          reject(new Error('No face detected'));
        }
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = reject;
    img.src = imageUrl;
  });
};

export const compareFaces = (
  descriptor1: Float32Array,
  descriptor2: Float32Array
): number => {
  return faceapi.euclideanDistance(descriptor1, descriptor2);
};

// Face matching threshold - lower values = more strict matching
export const FACE_MATCH_THRESHOLD = 0.6;

export const areFacesSimilar = (
  descriptor1: Float32Array,
  descriptor2: Float32Array
): boolean => {
  const distance = compareFaces(descriptor1, descriptor2);
  return distance < FACE_MATCH_THRESHOLD;
};
