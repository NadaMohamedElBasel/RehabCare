import { imageLoader } from '@cornerstonejs/core';

export type EnhancementMode = 'none' | 'sharpen' | 'smooth' | 'denoise';

export type EnhancementConfig = {
  mode: EnhancementMode;
  /** 0..1 */
  strength: number;
};

type AnyImage = any;

let derivedLoaderInitialized = false;

const derivedImageStore = new Map<string, AnyImage>();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function makeId() {
  // Browser-safe, no dependency on Node crypto
  const globalCrypto = (globalThis as any).crypto;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function getMinMax(src: ArrayLike<number>) {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < src.length; i++) {
    const v = Number(src[i]);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 0;
  }
  return { min, max };
}

function applyKernel3x3(
  src: ArrayLike<number>,
  width: number,
  height: number,
  kernel: number[],
  strength: number,
  outputConstructor: { new (length: number): any },
  clampMin: number,
  clampMax: number
) {
  const dst = new outputConstructor(src.length);
  const s = clamp01(strength);

  // Copy edges
  for (let x = 0; x < width; x++) {
    dst[x] = src[x] as any;
    dst[(height - 1) * width + x] = src[(height - 1) * width + x] as any;
  }
  for (let y = 0; y < height; y++) {
    dst[y * width] = src[y * width] as any;
    dst[y * width + (width - 1)] = src[y * width + (width - 1)] as any;
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const a00 = Number(src[i - width - 1]);
      const a01 = Number(src[i - width]);
      const a02 = Number(src[i - width + 1]);
      const a10 = Number(src[i - 1]);
      const a11 = Number(src[i]);
      const a12 = Number(src[i + 1]);
      const a20 = Number(src[i + width - 1]);
      const a21 = Number(src[i + width]);
      const a22 = Number(src[i + width + 1]);

      const conv =
        a00 * kernel[0] +
        a01 * kernel[1] +
        a02 * kernel[2] +
        a10 * kernel[3] +
        a11 * kernel[4] +
        a12 * kernel[5] +
        a20 * kernel[6] +
        a21 * kernel[7] +
        a22 * kernel[8];

      const original = Number(src[i]);
      const blended = original * (1 - s) + conv * s;
      dst[i] = clamp(blended, clampMin, clampMax) as any;
    }
  }

  return dst;
}

function applyMedian3x3(
  src: ArrayLike<number>,
  width: number,
  height: number,
  strength: number,
  outputConstructor: { new (length: number): any },
  clampMin: number,
  clampMax: number
) {
  const dst = new outputConstructor(src.length);
  const s = clamp01(strength);

  // Copy edges
  for (let x = 0; x < width; x++) {
    dst[x] = src[x] as any;
    dst[(height - 1) * width + x] = src[(height - 1) * width + x] as any;
  }
  for (let y = 0; y < height; y++) {
    dst[y * width] = src[y * width] as any;
    dst[y * width + (width - 1)] = src[y * width + (width - 1)] as any;
  }

  const window = new Array<number>(9);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      window[0] = Number(src[i - width - 1]);
      window[1] = Number(src[i - width]);
      window[2] = Number(src[i - width + 1]);
      window[3] = Number(src[i - 1]);
      window[4] = Number(src[i]);
      window[5] = Number(src[i + 1]);
      window[6] = Number(src[i + width - 1]);
      window[7] = Number(src[i + width]);
      window[8] = Number(src[i + width + 1]);
      window.sort((a, b) => a - b);
      const median = window[4];
      const original = Number(src[i]);
      const blended = original * (1 - s) + median * s;
      dst[i] = clamp(blended, clampMin, clampMax) as any;
    }
  }

  return dst;
}

export function initDerivedImageLoader() {
  if (derivedLoaderInitialized) return;

  imageLoader.registerImageLoader('derived', (imageId: string) => {
    const image = derivedImageStore.get(imageId);
    if (!image) {
      return {
        promise: Promise.reject(new Error(`Unknown derived imageId: ${imageId}`)),
      };
    }
    return { promise: Promise.resolve(image) };
  });

  derivedLoaderInitialized = true;
}

export async function createDerivedImageIds(sourceImageIds: string[], config: EnhancementConfig) {
  const mode = config.mode;
  const strength = clamp01(config.strength);

  if (mode === 'none' || strength === 0) return sourceImageIds;

  const derivedIds: string[] = [];

  for (const srcId of sourceImageIds) {
    const baseImage: AnyImage = await imageLoader.loadImage(srcId);
    const src = baseImage.getPixelData();
    const width = Number(baseImage.columns ?? baseImage.width);
    const height = Number(baseImage.rows ?? baseImage.height);

    if (!width || !height || !src?.length) {
      derivedIds.push(srcId);
      continue;
    }

    const { min, max } = getMinMax(src);
    const OutputCtor = (src as any).constructor as { new (length: number): any };

    let filtered: any;
    if (mode === 'smooth') {
      // Gaussian-ish blur kernel (normalized)
      const k = [1 / 16, 2 / 16, 1 / 16, 2 / 16, 4 / 16, 2 / 16, 1 / 16, 2 / 16, 1 / 16];
      filtered = applyKernel3x3(src, width, height, k, strength, OutputCtor, min, max);
    } else if (mode === 'sharpen') {
      // Classic sharpen kernel
      const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
      filtered = applyKernel3x3(src, width, height, k, strength, OutputCtor, min, max);
    } else {
      // denoise
      filtered = applyMedian3x3(src, width, height, strength, OutputCtor, min, max);
    }

    const derivedImageId = `derived:${makeId()}`;

    // Preserve prototype + methods; override pixel data.
    const derivedImage = Object.assign(Object.create(Object.getPrototypeOf(baseImage)), baseImage, {
      imageId: derivedImageId,
      getPixelData: () => filtered,
      sizeInBytes: filtered?.byteLength ?? baseImage.sizeInBytes,
    });

    derivedImageStore.set(derivedImageId, derivedImage);
    derivedIds.push(derivedImageId);
  }

  return derivedIds;
}
