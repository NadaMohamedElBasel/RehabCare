import { imageLoader, metaData } from '@cornerstonejs/core';

export type EnhancementMode = 'none' | 'sharpen' | 'smooth' | 'denoise';

export type EnhancementConfig = {
  mode: EnhancementMode;
  /** 0..1 */
  strength: number;
};

type AnyImage = any;

let derivedLoaderInitialized = false;
let derivedMetaDataProviderInitialized = false;

const derivedImageStore = new Map<string, AnyImage>();
const derivedImageKeyOrder: string[] = [];
const DERIVED_IMAGE_STORE_MAX = 400;
const DERIVED_IMAGE_STORE_PRUNE_BATCH = 80;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function clamp03(value: number) {
  return clamp(value, 0, 3);
}

function makeDerivedImageId(srcId: string, mode: EnhancementMode, strength: number) {
  // Deterministic IDs so slider updates don't leak memory by generating infinite derived IDs.
  // Quantize strength so "nearby" slider values still map cleanly.
  // Quantize to 0..300 (steps of 0.01) to support up to 3 passes.
  const s = Math.round(clamp03(strength) * 100);
  const encodedSrc = encodeURIComponent(srcId);
  return `derived:${mode}:${s}:${encodedSrc}`;
}

function storeDerivedImage(imageId: string, image: AnyImage) {
  if (!derivedImageStore.has(imageId)) {
    derivedImageKeyOrder.push(imageId);
  }
  derivedImageStore.set(imageId, image);

  // Simple pruning to avoid unbounded growth when users drag sliders.
  if (derivedImageKeyOrder.length > DERIVED_IMAGE_STORE_MAX) {
    const toRemove = derivedImageKeyOrder.splice(0, DERIVED_IMAGE_STORE_PRUNE_BATCH);
    toRemove.forEach((k) => derivedImageStore.delete(k));
  }
}

function parseDerivedImageId(imageId: string): { mode: EnhancementMode; strength: number; sourceId: string } | null {
  // Format: derived:${mode}:${s}:${encodeURIComponent(sourceId)}
  if (!imageId.startsWith('derived:')) return null;
  const parts = imageId.split(':');
  if (parts.length < 4) return null;

  const mode = parts[1] as EnhancementMode;
  if (!['none', 'sharpen', 'smooth', 'denoise'].includes(mode)) return null;

  const sInt = Number(parts[2]);
  const strength = clamp03(Number.isFinite(sInt) ? sInt / 100 : 0);

  const encodedSrc = parts.slice(3).join(':');
  try {
    const sourceId = decodeURIComponent(encodedSrc);
    if (!sourceId) return null;
    return { mode, strength, sourceId };
  } catch {
    return null;
  }
}

async function computeDerivedImage(sourceImageId: string, mode: EnhancementMode, strength: number) {
  const baseImage: AnyImage = await imageLoader.loadImage(sourceImageId);
  const srcRaw = baseImage.getPixelData();
  const width = Number(baseImage.columns ?? baseImage.width);
  const height = Number(baseImage.rows ?? baseImage.height);

  // If we can't filter, just return the base image.
  if (!width || !height || !srcRaw?.length) return baseImage;

  // Always filter in Float32 to avoid unsigned/signed overflow and to keep
  // predictable math across DICOM pixel formats.
  const src = new Float32Array(srcRaw.length);
  for (let i = 0; i < srcRaw.length; i++) src[i] = Number(srcRaw[i]);

  const { min, max } = getMinMax(src);
  const OutputCtor = Float32Array as unknown as { new (length: number): any };

  // Strength is interpreted as number of passes (0..3). Fractional part blends the final pass.
  const s = clamp03(strength);
  const fullPasses = Math.floor(s);
  const lastPassStrength = s - fullPasses;
  const applyPass = (input: ArrayLike<number>, passStrength: number) => {
    if (mode === 'smooth') {
      const k = [1 / 16, 2 / 16, 1 / 16, 2 / 16, 4 / 16, 2 / 16, 1 / 16, 2 / 16, 1 / 16];
      return applyKernel3x3(input, width, height, k, passStrength, OutputCtor, min, max);
    }
    if (mode === 'sharpen') {
      const k = [0, -1, 0, -1, 5, -1, 0, -1, 0];
      return applyKernel3x3(input, width, height, k, passStrength, OutputCtor, min, max);
    }
    return applyMedian3x3(input, width, height, passStrength, OutputCtor, min, max);
  };

  let filtered: any = src;
  for (let i = 0; i < fullPasses; i++) {
    filtered = applyPass(filtered, 1);
  }
  if (lastPassStrength > 0) {
    filtered = applyPass(filtered, lastPassStrength);
  }

  // Some datasets end up with a narrower range after filtering which can appear
  // "too dark" under the same VOI. Rescale back to the original [min,max].
  try {
    const { min: fMin, max: fMax } = getMinMax(filtered);
    if (Number.isFinite(min) && Number.isFinite(max) && fMax !== fMin && (fMin !== min || fMax !== max)) {
      rescaleToRange(filtered, fMin, fMax, min, max);
      for (let i = 0; i < filtered.length; i++) {
        filtered[i] = clamp(filtered[i], min, max);
      }
    }
  } catch {
    // ignore rescale failures
  }

  return {
    baseImage,
    filtered,
    width,
    height,
    min,
    max,
  };
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

function rescaleToRange(
  src: Float32Array,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number
) {
  if (!Number.isFinite(fromMin) || !Number.isFinite(fromMax) || fromMax === fromMin) {
    return src;
  }
  const scale = (toMax - toMin) / (fromMax - fromMin);
  for (let i = 0; i < src.length; i++) {
    src[i] = (src[i] - fromMin) * scale + toMin;
  }
  return src;
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

  if (!derivedMetaDataProviderInitialized) {
    // Ensure derived imageIds have the same metadata as their source images.
    // Many viewport operations rely on metadata lookups by imageId.
    metaData.addProvider((type: string, imageId: string) => {
      const parsed = parseDerivedImageId(imageId);
      if (!parsed) return undefined;
      return metaData.get(type, parsed.sourceId);
    }, 1000);

    derivedMetaDataProviderInitialized = true;
  }

  imageLoader.registerImageLoader('derived', (imageId: string) => {
    const cached = derivedImageStore.get(imageId);
    if (cached) return { promise: Promise.resolve(cached) };

    const parsed = parseDerivedImageId(imageId);
    if (!parsed) {
      return { promise: Promise.reject(new Error(`Invalid derived imageId: ${imageId}`)) };
    }

    // Compute on demand and cache.
    const promise = (async () => {
      if (parsed.mode === 'none' || parsed.strength === 0) {
        return imageLoader.loadImage(parsed.sourceId);
      }

      const { baseImage, filtered, min, max } = await computeDerivedImage(parsed.sourceId, parsed.mode, parsed.strength);

      const derivedImage: AnyImage = Object.assign(Object.create(Object.getPrototypeOf(baseImage)), baseImage, {
        imageId,
        getPixelData: () => filtered,
        sizeInBytes: filtered?.byteLength ?? baseImage.sizeInBytes,
        minPixelValue: min,
        maxPixelValue: max,
        smallestPixelValue: min,
        largestPixelValue: max,
      });

      // IMPORTANT: when GPU rendering is enabled, Cornerstone may prefer imageFrame/voxelManager
      // scalar data over getPixelData(). Ensure those point at our filtered pixels.
      try {
        if (derivedImage.imageFrame && typeof derivedImage.imageFrame === 'object') {
          derivedImage.imageFrame = { ...derivedImage.imageFrame, pixelData: filtered };
        }
      } catch {
        // ignore
      }

      try {
        // If voxelManager exists, it may provide the original scalar data.
        // Remove it so the renderer uses our overridden pixel source.
        if ('voxelManager' in derivedImage) {
          try {
            delete (derivedImage as any).voxelManager;
          } catch {
            (derivedImage as any).voxelManager = undefined;
          }
        }
      } catch {
        // ignore
      }

      storeDerivedImage(imageId, derivedImage);
      return derivedImage;
    })();

    return { promise };
  });

  derivedLoaderInitialized = true;
}

export async function createDerivedImageIds(sourceImageIds: string[], config: EnhancementConfig) {
  const mode = config.mode;
  const strength = clamp03(config.strength);

  if (mode === 'none' || strength === 0) return sourceImageIds;

  // Fast mapping only; actual pixels are computed lazily by the derived loader.
  return sourceImageIds.map((srcId) => makeDerivedImageId(srcId, mode, strength));
}
