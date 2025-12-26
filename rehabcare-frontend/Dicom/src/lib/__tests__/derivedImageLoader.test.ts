import { createDerivedImageIds, initDerivedImageLoader } from '../derivedImageLoader';

// Lightweight mock of Cornerstone's imageLoader for unit tests.
jest.mock(
  '@cornerstonejs/core',
  () => {
  const loaders = new Map<string, (imageId: string) => { promise: Promise<any> }>();
  const baseImages = new Map<string, any>();

  const imageLoader = {
    __setBaseImage(imageId: string, image: any) {
      baseImages.set(imageId, image);
    },
    registerImageLoader(scheme: string, loaderFn: any) {
      loaders.set(scheme, loaderFn);
    },
    async loadImage(imageId: string) {
      const scheme = imageId.includes(':') ? imageId.split(':')[0] : '';
      if (scheme && loaders.has(scheme)) {
        const res = loaders.get(scheme)!(imageId);
        return res.promise;
      }
      const img = baseImages.get(imageId);
      if (!img) throw new Error(`No base image registered for ${imageId}`);
      return img;
    },
  };

    return { imageLoader };
  },
  { virtual: true }
);

// Import after mock so derivedImageLoader sees the mocked imageLoader
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { imageLoader } = require('@cornerstonejs/core');

describe('derivedImageLoader enhancement filters', () => {
  beforeEach(() => {
    initDerivedImageLoader();
  });

  function makeBaseImage(pixelData: ArrayLike<number>, width: number, height: number) {
    const typed = new Int16Array(pixelData as any);
    return {
      imageId: 'base',
      rows: height,
      columns: width,
      windowCenter: 0,
      windowWidth: 1,
      minPixelValue: -1000,
      maxPixelValue: 3000,
      getPixelData: () => typed,
      sizeInBytes: typed.byteLength,
    };
  }

  it('returns original ids for mode=none or strength=0', async () => {
    const srcIds = ['src:1'];
    imageLoader.__setBaseImage(srcIds[0], makeBaseImage([1, 2, 3, 4], 2, 2));

    await expect(createDerivedImageIds(srcIds, { mode: 'none', strength: 0.6 })).resolves.toEqual(srcIds);
    await expect(createDerivedImageIds(srcIds, { mode: 'sharpen', strength: 0 })).resolves.toEqual(srcIds);
  });

  it('smooth does not crush intensities to one dark value', async () => {
    const srcIds = ['src:1'];
    // 3x3 with center brighter
    imageLoader.__setBaseImage(
      srcIds[0],
      makeBaseImage([
        0, 0, 0,
        0, 1000, 0,
        0, 0, 0,
      ],
      3,
      3)
    );

    const derivedIds = await createDerivedImageIds(srcIds, { mode: 'smooth', strength: 1 });
    expect(derivedIds[0]).toMatch(/^derived:/);

    const derivedImage = await imageLoader.loadImage(derivedIds[0]);
    const px: Float32Array = derivedImage.getPixelData();

    // Should still have multiple unique values (not all min)
    const unique = new Set(Array.from(px).map((v) => Math.round(v)));
    expect(unique.size).toBeGreaterThan(1);

    // Should preserve metadata range for VOI usage
    expect(derivedImage.minPixelValue).toBeDefined();
    expect(derivedImage.maxPixelValue).toBeDefined();
  });

  it('sharpen does not wrap/overflow and stays within original range', async () => {
    const srcIds = ['src:1'];
    imageLoader.__setBaseImage(
      srcIds[0],
      makeBaseImage([
        -1000, -1000, -1000,
        -1000, 3000, -1000,
        -1000, -1000, -1000,
      ],
      3,
      3)
    );

    const derivedIds = await createDerivedImageIds(srcIds, { mode: 'sharpen', strength: 1 });
    const derivedImage = await imageLoader.loadImage(derivedIds[0]);
    const px: Float32Array = derivedImage.getPixelData();

    let min = Infinity;
    let max = -Infinity;
    for (const v of px) {
      if (v < min) min = v;
      if (v > max) max = v;
    }

    expect(min).toBeGreaterThanOrEqual(-1000);
    expect(max).toBeLessThanOrEqual(3000);
  });

  it('denoise keeps edges and reduces impulse noise', async () => {
    const srcIds = ['src:1'];
    // Single noisy pixel in the middle
    imageLoader.__setBaseImage(
      srcIds[0],
      makeBaseImage([
        10, 10, 10,
        10, 999, 10,
        10, 10, 10,
      ],
      3,
      3)
    );

    const derivedIds = await createDerivedImageIds(srcIds, { mode: 'denoise', strength: 1 });
    const derivedImage = await imageLoader.loadImage(derivedIds[0]);
    const px: Float32Array = derivedImage.getPixelData();

    // Center should move towards neighbors (median => 10)
    expect(Math.round(px[4])).toBe(10);
  });
});
