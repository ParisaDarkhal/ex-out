export const imageToCanvas = (image: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = image.width;
  canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  return canvas;
};

export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  quality = 0.9
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/png',
      quality
    );
  });
};

export const loadImageFromUrl = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

export const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
};

export const resizeImage = (
  image: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Calculate new dimensions
  let { width, height } = image;

  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  return canvas;
};

export const maskToCanvas = (maskData: ImageData): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = maskData.width;
  canvas.height = maskData.height;
  ctx.putImageData(maskData, 0, 0);
  return canvas;
};
