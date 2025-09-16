import * as bodyPix from '@tensorflow-models/body-pix';
import * as tf from '@tensorflow/tfjs';

let segmentationModel: bodyPix.BodyPix | null = null;

export const loadBodyPixModel = async (): Promise<bodyPix.BodyPix> => {
  if (segmentationModel) return segmentationModel;

  // Load BodyPix model with reasonable performance/accuracy tradeoff
  segmentationModel = await bodyPix.load({
    architecture: 'MobileNetV1',
    outputStride: 16,
    multiplier: 0.75,
    quantBytes: 2,
  });

  return segmentationModel;
};

export const segmentPerson = async (
  imageElement: HTMLImageElement,
  faceBoundingBox?: { x: number; y: number; width: number; height: number }
): Promise<ImageData> => {
  const model = await loadBodyPixModel();

  // Generate person segmentation
  const segmentation = await model.segmentPerson(imageElement, {
    flipHorizontal: false,
    internalResolution: 'medium',
    segmentationThreshold: 0.7,
    maxDetections: 10,
    scoreThreshold: 0.2,
    nmsRadius: 20,
  });

  // Create canvas for mask processing
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = imageElement.width;
  canvas.height = imageElement.height;

  // Convert segmentation to binary mask
  const maskData = new Uint8ClampedArray(canvas.width * canvas.height * 4);

  for (let i = 0; i < segmentation.data.length; i++) {
    const pixelIndex = i * 4;
    const isPersonPixel = segmentation.data[i] === 1;

    if (isPersonPixel) {
      maskData[pixelIndex] = 255; // R
      maskData[pixelIndex + 1] = 255; // G
      maskData[pixelIndex + 2] = 255; // B
      maskData[pixelIndex + 3] = 255; // A
    } else {
      maskData[pixelIndex] = 0; // R
      maskData[pixelIndex + 1] = 0; // G
      maskData[pixelIndex + 2] = 0; // B
      maskData[pixelIndex + 3] = 255; // A
    }
  }

  // If face bounding box is provided, ensure that area is definitely included
  if (faceBoundingBox) {
    const { x, y, width, height } = faceBoundingBox;

    for (
      let py = Math.max(0, y);
      py < Math.min(canvas.height, y + height);
      py++
    ) {
      for (
        let px = Math.max(0, x);
        px < Math.min(canvas.width, x + width);
        px++
      ) {
        const pixelIndex = (py * canvas.width + px) * 4;
        maskData[pixelIndex] = 255; // R
        maskData[pixelIndex + 1] = 255; // G
        maskData[pixelIndex + 2] = 255; // B
        maskData[pixelIndex + 3] = 255; // A
      }
    }
  }

  // Create ImageData object
  const imageData = new ImageData(maskData, canvas.width, canvas.height);

  return imageData;
};

export const combineMasks = (mask1: ImageData, mask2: ImageData): ImageData => {
  if (mask1.width !== mask2.width || mask1.height !== mask2.height) {
    throw new Error('Mask dimensions must match');
  }

  const combinedData = new Uint8ClampedArray(mask1.data.length);

  for (let i = 0; i < mask1.data.length; i += 4) {
    // Combine masks using OR operation
    const mask1Value = mask1.data[i] > 128;
    const mask2Value = mask2.data[i] > 128;
    const combined = mask1Value || mask2Value;

    const value = combined ? 255 : 0;
    combinedData[i] = value; // R
    combinedData[i + 1] = value; // G
    combinedData[i + 2] = value; // B
    combinedData[i + 3] = 255; // A
  }

  return new ImageData(combinedData, mask1.width, mask1.height);
};
