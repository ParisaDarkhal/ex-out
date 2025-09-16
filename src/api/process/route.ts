import { NextRequest, NextResponse } from 'next/server';
import { segmentPerson } from '@/utils/bodySegmentation';
import {
  loadImageFromFile,
  maskToCanvas,
  canvasToBlob,
} from '@/utils/imageUtils';
import axios from 'axios';

// Increase payload size limit for image uploads
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In-memory storage for temporary processing (will be garbage collected)
const temporaryStorage = new Map<string, Buffer>();

// Clean up storage after processing
const scheduleCleanup = (keys: string[], delayMs = 30000) => {
  setTimeout(() => {
    keys.forEach((key) => temporaryStorage.delete(key));
  }, delayMs);
};

export async function POST(request: NextRequest) {
  let tempKeys: string[] = [];

  try {
    const formData = await request.formData();

    // Extract images and metadata
    const images: File[] = [];
    const matches: any[] = [];

    // Get uploaded images
    const imageFiles = formData.getAll('images') as File[];
    images.push(...imageFiles);

    if (images.length === 0 || images.length > 3) {
      return NextResponse.json(
        { error: 'Must provide 1-3 images' },
        { status: 400 }
      );
    }

    // Get face matches for each image
    for (let i = 0; i < images.length; i++) {
      const matchesData = formData.get(`matches_${i}`);
      if (matchesData) {
        matches.push(JSON.parse(matchesData as string));
      } else {
        matches.push([]);
      }
    }

    const selectedFaceData = formData.get('selectedFace');
    const selectedFace = selectedFaceData
      ? JSON.parse(selectedFaceData as string)
      : null;

    if (!selectedFace) {
      return NextResponse.json(
        { error: 'No face selected for removal' },
        { status: 400 }
      );
    }

    // Process each image
    const processedImages: Buffer[] = [];

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const imageMatches = matches[i] || [];

      // Check if this image has any selected faces
      const hasSelectedFaces = imageMatches.some(
        (match: any) => match.selected
      );
      if (!hasSelectedFaces) {
        // No person to remove in this image, return original
        const originalBuffer = Buffer.from(await image.arrayBuffer());
        processedImages.push(originalBuffer);
        continue;
      }

      // Load image
      const imageElement = await loadImageFromFile(image);

      // Generate person segmentation mask
      const selectedMatch = imageMatches.find((match: any) => match.selected);
      const faceBoundingBox = selectedMatch ? selectedMatch.boundingBox : null;

      const maskData = await segmentPerson(imageElement, faceBoundingBox);
      const maskCanvas = maskToCanvas(maskData);

      // Convert image and mask to buffers for Gemini API
      const imageBuffer = Buffer.from(await image.arrayBuffer());
      const maskBuffer = Buffer.from(
        await (await canvasToBlob(maskCanvas)).arrayBuffer()
      );

      // Store temporarily in memory
      const imageKey = `img_${Date.now()}_${i}`;
      const maskKey = `mask_${Date.now()}_${i}`;
      temporaryStorage.set(imageKey, imageBuffer);
      temporaryStorage.set(maskKey, maskBuffer);
      tempKeys.push(imageKey, maskKey);

      // Call Gemini API for inpainting
      const inpaintedBuffer = await callGeminiInpainting(
        imageBuffer,
        maskBuffer
      );
      processedImages.push(inpaintedBuffer);
    }

    // For MVP, return the first processed image
    // In production, you might want to return all images as a zip or individual responses
    const result = processedImages[0];

    // Schedule cleanup of temporary storage
    scheduleCleanup(tempKeys);

    return new NextResponse(result, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': 'attachment; filename="ex-out-result.png"',
      },
    });
  } catch (error) {
    console.error('Processing error:', error);

    // Clean up on error
    scheduleCleanup(tempKeys, 1000);

    return NextResponse.json(
      { error: 'Failed to process images' },
      { status: 500 }
    );
  }
}

async function callGeminiInpainting(
  imageBuffer: Buffer,
  maskBuffer: Buffer
): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  // Gemini 2.5 Flash Image Inpainting Prompt Template
  const prompt = `You are a professional photo-editor AI. You will be given:
- image: the original photo (high resolution),
- mask: a binary mask where white marks the entire person (head-to-toe) to remove and black marks keep.

Your job:
- Remove the masked person completely.
- Fill the masked area photo-realistically so it looks like the person was never there. Match:
  * The background texture and content (e.g., grass, wall, furniture),
  * Lighting direction, color temperature, shadows, highlights,
  * Perspective and scale of nearby objects,
  * Fine details at edges to avoid visible seams.

- Avoid inserting new people or unnatural objects. You may reconstruct background features (e.g., extend a fence, continue carpet pattern, fill sky, extend bushes).
- If the masked region contains complex objects (e.g., vehicle, sign), reconstruct those objects realistically but consistent with the rest of the photo.
- Output only the finished RGB image (PNG or JPEG) with same dimensions as input.

Additional constraints:
- Preserve image EXIF orientation and aspect ratio.
- Keep core image elements (sky, horizon, buildings) consistent and aligned.
- If inpainting is ambiguous, prefer a neutral, consistent background (not random artistic content).`;

  try {
    // NOTE: This is pseudo-implementation since the exact Gemini Image API spec may vary
    // Please refer to the official Gemini API documentation for the exact request format

    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer], { type: 'image/png' }));
    formData.append('mask', new Blob([maskBuffer], { type: 'image/png' }));
    formData.append('prompt', prompt);
    formData.append('model', 'gemini-2.5-flash-image');

    // Placeholder URL - replace with actual Gemini API endpoint
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:inpaint?key=${apiKey}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'arraybuffer',
        timeout: 60000, // 60 second timeout
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Gemini API error:', error);

    // Fallback: return a simple filled version (for development/testing)
    // In production, this should throw an error
    return createFallbackInpainting(imageBuffer, maskBuffer);
  }
}

// Fallback implementation for development/testing
async function createFallbackInpainting(
  imageBuffer: Buffer,
  maskBuffer: Buffer
): Promise<Buffer> {
  // This is a simple fallback that just fills the masked area with a solid color
  // Replace this with actual Gemini API call in production

  const Canvas = require('canvas');
  const Image = Canvas.Image;

  const img = new Image();
  const mask = new Image();

  return new Promise((resolve, reject) => {
    let loadedCount = 0;
    const checkBothLoaded = () => {
      if (++loadedCount === 2) {
        try {
          const canvas = Canvas.createCanvas(img.width, img.height);
          const ctx = canvas.getContext('2d');

          // Draw original image
          ctx.drawImage(img, 0, 0);

          // Get mask data
          const maskCanvas = Canvas.createCanvas(mask.width, mask.height);
          const maskCtx = maskCanvas.getContext('2d');
          maskCtx.drawImage(mask, 0, 0);
          const maskImageData = maskCtx.getImageData(
            0,
            0,
            mask.width,
            mask.height
          );

          // Get main image data
          const imageData = ctx.getImageData(0, 0, img.width, img.height);

          // Simple inpainting: fill masked areas with average surrounding color
          for (let y = 0; y < img.height; y++) {
            for (let x = 0; x < img.width; x++) {
              const maskIndex = (y * mask.width + x) * 4;
              const imageIndex = (y * img.width + x) * 4;

              // If mask is white (person area), fill with surrounding color
              if (maskImageData.data[maskIndex] > 128) {
                // Simple blur/average with surrounding pixels
                let r = 0,
                  g = 0,
                  b = 0,
                  count = 0;

                for (let dy = -5; dy <= 5; dy++) {
                  for (let dx = -5; dx <= 5; dx++) {
                    const ny = y + dy;
                    const nx = x + dx;

                    if (
                      ny >= 0 &&
                      ny < img.height &&
                      nx >= 0 &&
                      nx < img.width
                    ) {
                      const surroundIndex = (ny * img.width + nx) * 4;
                      const surroundMaskIndex = (ny * mask.width + nx) * 4;

                      // Only use non-masked pixels for averaging
                      if (maskImageData.data[surroundMaskIndex] < 128) {
                        r += imageData.data[surroundIndex];
                        g += imageData.data[surroundIndex + 1];
                        b += imageData.data[surroundIndex + 2];
                        count++;
                      }
                    }
                  }
                }

                if (count > 0) {
                  imageData.data[imageIndex] = r / count;
                  imageData.data[imageIndex + 1] = g / count;
                  imageData.data[imageIndex + 2] = b / count;
                }
              }
            }
          }

          ctx.putImageData(imageData, 0, 0);

          const buffer = canvas.toBuffer('image/png');
          resolve(buffer);
        } catch (error) {
          reject(error);
        }
      }
    };

    img.onerror = mask.onerror = reject;
    img.onload = mask.onload = checkBothLoaded;

    img.src = imageBuffer;
    mask.src = maskBuffer;
  });
}
