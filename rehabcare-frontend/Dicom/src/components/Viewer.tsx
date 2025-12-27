import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import {
  RenderingEngine,
  Enums,
  getRenderingEngine,
  StackViewport,
  imageLoader,
  volumeLoader,
  setVolumesForViewports,
  cache,
} from '@cornerstonejs/core';
import { createDerivedImageIds, type EnhancementConfig } from '@lib/derivedImageLoader';
import {
  addTool,
  ToolGroupManager,
  SynchronizerManager,
  synchronizers,
  ZoomTool,
  PanTool,
  WindowLevelTool,
  PlanarRotateTool,
  TrackballRotateTool,
  LengthTool,
  AngleTool,
  ScaleOverlayTool,
  RectangleROITool,
  CircleROITool,
  CrosshairsTool,
  ArrowAnnotateTool,
  annotation,
  Enums as csToolsEnums,
} from '@cornerstonejs/tools';
import html2canvas from 'html2canvas';

const { MouseBindings } = csToolsEnums;

interface ViewerProps {
  // One or more DICOM imageIds (wadouri:...) - if multiple, they form a volume/series.
  imageIds: string[];

  // stack: single viewport stack rendering
  // mpr: 3 orthographic viewports (axial/sagittal/coronal)
  // vr: volume rendering (3D)
  mode: 'stack' | 'mpr' | 'vr';

  // In MPR, which viewport(s) should receive mouse interactions.
  // - 'axial'|'sagittal'|'coronal' => only that plane is interactive
  // - 'all' => all planes interactive + optional sync
  mprInteractionTarget?: 'axial' | 'sagittal' | 'coronal' | 'all';

  // Stack-mode enhancements only (no-op in MPR)
  enhancements?: {
    /** 0..3 */
    sharpen?: number;
    /** 0..3 */
    smooth?: number;
    /** 0..3 */
    denoise?: number;
  };
}

export interface ViewerRef {
  downloadImage: (format?: string) => void;
  captureImageDataUrl: (format?: string) => Promise<string>;
  getAllAnnotations: () => any[];
  removeAllAnnotations: () => void;
  setWindowLevel: (opts: {
    center: number;
    width: number;
    target?: 'stack' | 'axial' | 'sagittal' | 'coronal' | 'all';
  }) => void;
}

const VIEWPORT_ID = 'defaultViewport';
const RENDERING_ENGINE_ID = 'defaultRenderingEngine';
const TOOLGROUP_ID = 'defaultToolGroup';

const MPR_AXIAL_VIEWPORT_ID = 'mprAxialViewport';
const MPR_SAGITTAL_VIEWPORT_ID = 'mprSagittalViewport';
const MPR_CORONAL_VIEWPORT_ID = 'mprCoronalViewport';

const MPR_TOOLGROUP_ID = 'mprToolGroup';

const VR_VIEWPORT_ID = 'vrViewport';
const VR_TOOLGROUP_ID = 'vrToolGroup';
const VR_VOLUME_ID = 'cornerstoneStreamingImageVolume:vrVolume';

const MPR_ZOOMPAN_SYNC_ID = 'mprZoomPanSync';
const MPR_VOI_SYNC_ID = 'mprVoiSync';

const MPR_VOLUME_ID = 'cornerstoneStreamingImageVolume:mprVolume';

let toolsRegistered = false;

function registerToolsOnce() {
  if (toolsRegistered) return;
  // Register tools globally with Cornerstone Tools
  addTool(ZoomTool);
  addTool(PanTool);
  addTool(WindowLevelTool);
  addTool(PlanarRotateTool);
  addTool(TrackballRotateTool);
  addTool(LengthTool);
  addTool(AngleTool);
  addTool(ScaleOverlayTool);
  addTool(RectangleROITool);
  addTool(CircleROITool);
  addTool(CrosshairsTool);
  addTool(ArrowAnnotateTool);
  toolsRegistered = true;
}

function ensureToolGroup(toolGroupId: string, opts?: { includeCrosshairs?: boolean }) {
  let toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
  if (toolGroup) return toolGroup;

  toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
  if (!toolGroup) {
    throw new Error(`Failed to create tool group: ${toolGroupId}`);
  }

  const includeCrosshairs = Boolean(opts?.includeCrosshairs);

  // Add tools to the tool group so they can be activated later
  toolGroup.addTool(ZoomTool.toolName);
  toolGroup.addTool(PanTool.toolName);
  toolGroup.addTool(WindowLevelTool.toolName);
  toolGroup.addTool(PlanarRotateTool.toolName);
  toolGroup.addTool(LengthTool.toolName);
  toolGroup.addTool(AngleTool.toolName);
  toolGroup.addTool(ScaleOverlayTool.toolName);
  toolGroup.addTool(RectangleROITool.toolName);
  toolGroup.addTool(CircleROITool.toolName);
  toolGroup.addTool(ArrowAnnotateTool.toolName);
  if (includeCrosshairs) {
    toolGroup.addTool(CrosshairsTool.toolName);
  }

  // Default interaction: Window/Level on left drag
  toolGroup.setToolActive(WindowLevelTool.toolName, { bindings: [{ mouseButton: 1 }] });

  // Crosshairs stays enabled so it can render reference lines even when another tool is active.
  if (includeCrosshairs) {
    toolGroup.setToolEnabled(CrosshairsTool.toolName);
  }

  return toolGroup;
}

function ensureVrToolGroup() {
  let toolGroup = ToolGroupManager.getToolGroup(VR_TOOLGROUP_ID);
  if (toolGroup) return toolGroup;

  toolGroup = ToolGroupManager.createToolGroup(VR_TOOLGROUP_ID);
  if (!toolGroup) {
    throw new Error(`Failed to create tool group: ${VR_TOOLGROUP_ID}`);
  }

  toolGroup.addTool(TrackballRotateTool.toolName);
  toolGroup.addTool(ZoomTool.toolName);
  toolGroup.addTool(PanTool.toolName);

  // Default interaction (match MontuCore):
  // Left = rotate, Right = zoom, Middle = pan
  toolGroup.setToolActive(TrackballRotateTool.toolName, {
    bindings: [{ mouseButton: MouseBindings.Primary }],
  });
  toolGroup.setToolActive(ZoomTool.toolName, {
    bindings: [{ mouseButton: MouseBindings.Secondary }],
  });
  toolGroup.setToolActive(PanTool.toolName, {
    bindings: [{ mouseButton: MouseBindings.Auxiliary }],
  });

  return toolGroup;
}

const Viewer = forwardRef<ViewerRef, ViewerProps>(
  ({ imageIds, mode, mprInteractionTarget = 'axial', enhancements }, ref) => {
  // Root container used for screenshots (captures stack OR all MPR planes)
  const containerRef = useRef<HTMLDivElement>(null);

  // Cornerstone viewport host elements
  const stackElementRef = useRef<HTMLDivElement>(null);
  const axialElementRef = useRef<HTMLDivElement>(null);
  const sagittalElementRef = useRef<HTMLDivElement>(null);
  const coronalElementRef = useRef<HTMLDivElement>(null);
  const vrElementRef = useRef<HTMLDivElement>(null);

  // Slice sliders (MPR): each orthographic viewport can scroll independently
  const [axialMax, setAxialMax] = useState(0);
  const [sagittalMax, setSagittalMax] = useState(0);
  const [coronalMax, setCoronalMax] = useState(0);
  const [axialSlice, setAxialSlice] = useState(0);
  const [sagittalSlice, setSagittalSlice] = useState(0);
  const [coronalSlice, setCoronalSlice] = useState(0);

  const zoomPanSyncRef = useRef<ReturnType<typeof synchronizers.createZoomPanSynchronizer> | null>(null);
  const voiSyncRef = useRef<ReturnType<typeof synchronizers.createVOISynchronizer> | null>(null);

  // Used to trigger effects that must run after viewport initialization.
  const [stackInitTick, setStackInitTick] = useState(0);

  // Expose download function via ref
  useImperativeHandle(ref, () => ({
    downloadImage: async (format = 'image/jpeg') => {
      const element = containerRef.current;
      if (!element) {
        console.error('Viewer element not found.');
        return;
      }

      try {
        // Use html2canvas to capture the entire viewer element
        const canvas = await html2canvas(element, {
          useCORS: true, // Important if you are loading images from external URLs
          allowTaint: true,
        });

        const dataUrl = canvas.toDataURL(format, 1.0); // 1.0 for max quality
        const link = document.createElement('a');
        link.download = `dicom-image.${format.split('/')[1]}`;
        link.href = dataUrl;
        link.click();
        link.remove();
      } catch (error) {
        console.error('Error generating or downloading image with annotations:', error);
        alert('Failed to download image with annotations.');
      }
    },

    captureImageDataUrl: async (format = 'image/jpeg') => {
      const element = containerRef.current;
      if (!element) {
        throw new Error('Viewer element not found.');
      }
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
      });
      return canvas.toDataURL(format, 0.9);
    },

    getAllAnnotations: () => {
      try {
        const anns = (annotation as any)?.state?.getAllAnnotations?.();
        return Array.isArray(anns) ? anns : [];
      } catch {
        return [];
      }
    },

    removeAllAnnotations: () => {
      try {
        (annotation as any)?.state?.removeAllAnnotations?.();
      } catch {
        // no-op
      }
    },

    setWindowLevel: ({ center, width, target = mode === 'mpr' ? mprInteractionTarget : 'stack' }) => {
      const engine = getRenderingEngine(RENDERING_ENGINE_ID);
      if (!engine) return;

      const safeWidth = Number.isFinite(width) ? Math.max(1, width) : 1;
      const safeCenter = Number.isFinite(center) ? center : 0;
      const voiRange = {
        lower: safeCenter - safeWidth / 2,
        upper: safeCenter + safeWidth / 2,
      };

      const applyToViewport = (viewportId: string) => {
        const vp: any = engine.getViewport(viewportId);
        if (!vp?.setProperties) return;
        vp.setProperties({ voiRange });
        vp.render?.();
      };

      if (mode === 'stack' || target === 'stack') {
        applyToViewport(VIEWPORT_ID);
        return;
      }

      if (target === 'all') {
        applyToViewport(MPR_AXIAL_VIEWPORT_ID);
        applyToViewport(MPR_SAGITTAL_VIEWPORT_ID);
        applyToViewport(MPR_CORONAL_VIEWPORT_ID);
        return;
      }

      if (target === 'axial') applyToViewport(MPR_AXIAL_VIEWPORT_ID);
      if (target === 'sagittal') applyToViewport(MPR_SAGITTAL_VIEWPORT_ID);
      if (target === 'coronal') applyToViewport(MPR_CORONAL_VIEWPORT_ID);
    },
  }));

  useEffect(() => {
    // Wait for the right DOM nodes to exist before initializing viewports
    const stackEl = stackElementRef.current;
    const axialEl = axialElementRef.current;
    const sagittalEl = sagittalElementRef.current;
    const coronalEl = coronalElementRef.current;
    const vrEl = vrElementRef.current;

    if (mode === 'stack' && !stackEl) return;
    if (mode === 'mpr' && (!axialEl || !sagittalEl || !coronalEl)) return;
    if (mode === 'vr' && !vrEl) return;

    let renderingEngine: RenderingEngine | null = null;

    const initializeViewer = async () => {
      try {
        registerToolsOnce();

        // Bootstrap (or reuse) the Cornerstone rendering engine
        const existingEngine = getRenderingEngine(RENDERING_ENGINE_ID);
        renderingEngine = existingEngine || new RenderingEngine(RENDERING_ENGINE_ID);

        if (mode === 'stack') {
          // Single stack viewport
          renderingEngine.setViewports([
            {
              viewportId: VIEWPORT_ID,
              element: stackEl!,
              type: Enums.ViewportType.STACK,
            },
          ]);

          // Tool group for stack mode
          // Stack mode should NOT enable CrosshairsTool (it expects MPR viewports).
          const toolGroup = ensureToolGroup(TOOLGROUP_ID, { includeCrosshairs: false });
          toolGroup.addViewport(VIEWPORT_ID, RENDERING_ENGINE_ID);

          // Compute VOI defaults using the first slice
          const firstImage = await imageLoader.loadImage(imageIds[0]);
          const pixelData = firstImage.getPixelData();

          let min = Infinity;
          let max = -Infinity;
          for (let i = 0; i < pixelData.length; i++) {
            const value = pixelData[i];
            if (value < min) min = value;
            if (value > max) max = value;
          }

          const windowCenter = Number(firstImage.windowCenter || (min + max) / 2);
          const windowWidth = Number(firstImage.windowWidth || (max - min));

          // StackViewport shows one plane, optionally with multiple images in the stack
          const viewport = renderingEngine.getViewport(VIEWPORT_ID) as StackViewport;

          // Keep init fast: enhancement swapping is handled in the effect below.
          viewport.setStack(imageIds);
          viewport.setProperties({
            voiRange: {
              lower: windowCenter - windowWidth / 2,
              upper: windowCenter + windowWidth / 2,
            },
          });
          viewport.render();

          // Signal that the stack viewport is ready (so slider effects can apply immediately).
          setStackInitTick((v) => v + 1);
          return;
        }

        if (mode === 'vr') {
          renderingEngine.setViewports([
            {
              viewportId: VR_VIEWPORT_ID,
              element: vrEl!,
              type: Enums.ViewportType.VOLUME_3D,
              defaultOptions: {
                orientation: Enums.OrientationAxis.ACQUISITION,
                background: [0, 0, 0],
              },
            },
          ]);

          // Create a dedicated 3D tool group with TrackballRotate/Zoom/Pan bindings
          const vrGroup = ensureVrToolGroup();
          vrGroup.addViewport(VR_VIEWPORT_ID, RENDERING_ENGINE_ID);

          // If the user loads a new series, drop the previous cached volume so we rebuild it.
          try {
            cache.removeVolumeLoadObject(VR_VOLUME_ID);
          } catch {
            // not cached yet
          }

          // Warm image cache (helps avoid black viewports in some setups)
          try {
            await Promise.all(imageIds.map((id) => (imageLoader as any).loadAndCacheImage?.(id) ?? imageLoader.loadImage(id)));
          } catch {
            // ignore warming failures; volume loader will still try to load
          }

          const volume = await volumeLoader.createAndCacheVolume(VR_VOLUME_ID, { imageIds });
          if (typeof (volume as any).load === 'function') {
            await (volume as any).load();
          }

          await setVolumesForViewports(renderingEngine, [{ volumeId: VR_VOLUME_ID }], [VR_VIEWPORT_ID]);

          const vp: any = renderingEngine.getViewport(VR_VIEWPORT_ID);
          try {
            vp?.setProperties?.({ preset: 'CT-Bone' });
          } catch {
            // ignore preset failures
          }
          vp?.render?.();
          return;
        }

        // MPR mode: create 3 orthographic viewports from a volume
        renderingEngine.setViewports([
          {
            viewportId: MPR_AXIAL_VIEWPORT_ID,
            element: axialEl!,
            type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.AXIAL },
          },
          {
            viewportId: MPR_SAGITTAL_VIEWPORT_ID,
            element: sagittalEl!,
            type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.SAGITTAL },
          },
          {
            viewportId: MPR_CORONAL_VIEWPORT_ID,
            element: coronalEl!,
            type: Enums.ViewportType.ORTHOGRAPHIC,
            defaultOptions: { orientation: Enums.OrientationAxis.CORONAL },
          },
        ]);

        // Build a volume from the imageIds (this is what enables true MPR)
        // If the user loads a new series, drop the previous cached volume so we rebuild it.
        try {
          cache.removeVolumeLoadObject(MPR_VOLUME_ID);
        } catch {
          // not cached yet
        }
        const volume = await volumeLoader.createAndCacheVolume(MPR_VOLUME_ID, { imageIds });
        // Streaming volumes load progressively; static volumes don't need this.
        if (typeof (volume as any).load === 'function') {
          (volume as any).load();
        }

        // Attach the volume to each orthographic viewport
        const axialVp = renderingEngine.getViewport(MPR_AXIAL_VIEWPORT_ID) as any;
        const sagittalVp = renderingEngine.getViewport(MPR_SAGITTAL_VIEWPORT_ID) as any;
        const coronalVp = renderingEngine.getViewport(MPR_CORONAL_VIEWPORT_ID) as any;

        await Promise.all([
          axialVp.setVolumes([{ volumeId: MPR_VOLUME_ID }], true),
          sagittalVp.setVolumes([{ volumeId: MPR_VOLUME_ID }], true),
          coronalVp.setVolumes([{ volumeId: MPR_VOLUME_ID }], true),
        ]);

        // Apply an initial VOI range so MPR matches stack's default leveling behavior.
        try {
          const firstImage = await imageLoader.loadImage(imageIds[0]);
          const pixelData = firstImage.getPixelData();

          let min = Infinity;
          let max = -Infinity;
          for (let i = 0; i < pixelData.length; i++) {
            const value = pixelData[i];
            if (value < min) min = value;
            if (value > max) max = value;
          }

          const windowCenter = Number(firstImage.windowCenter || (min + max) / 2);
          const windowWidth = Number(firstImage.windowWidth || (max - min));
          const voiRange = {
            lower: windowCenter - windowWidth / 2,
            upper: windowCenter + windowWidth / 2,
          };

          axialVp.setProperties?.({ voiRange });
          sagittalVp.setProperties?.({ voiRange });
          coronalVp.setProperties?.({ voiRange });
        } catch (e) {
          console.warn('Failed to set initial MPR VOI:', e);
        }

        const setSliceIndexSafe = (vp: any, sliceIndex: number) => {
          if (!vp) return;
          try {
            if (typeof vp.setSliceIndex === 'function') {
              vp.setSliceIndex(sliceIndex);
              return;
            }
          } catch {
            // ignore
          }

          try {
            if (typeof vp.setViewReference === 'function' && typeof vp.getViewReference === 'function') {
              const viewRef = vp.getViewReference({ sliceIndex });
              if (viewRef) vp.setViewReference(viewRef);
            }
          } catch {
            // ignore
          }
        };

        const waitNextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        // After grid/CSS layout, force a resize before computing slice counts.
        await waitNextFrame();
        await waitNextFrame();

        try {
          renderingEngine.resize?.(true, true);
        } catch {
          // ignore
        }

        // Initialize sliders to the middle slice for each plane (after resize so slice counts are accurate)
        const aMax = axialVp.getNumberOfSlices?.() ?? 0;
        const sMax = sagittalVp.getNumberOfSlices?.() ?? 0;
        const cMax = coronalVp.getNumberOfSlices?.() ?? 0;

        setAxialMax(aMax);
        setSagittalMax(sMax);
        setCoronalMax(cMax);

        const aMid = aMax > 0 ? Math.floor(aMax / 2) : 0;
        const sMid = sMax > 0 ? Math.floor(sMax / 2) : 0;
        const cMid = cMax > 0 ? Math.floor(cMax / 2) : 0;

        setAxialSlice(aMid);
        setSagittalSlice(sMid);
        setCoronalSlice(cMid);

        setSliceIndexSafe(axialVp, aMid);
        setSliceIndexSafe(sagittalVp, sMid);
        setSliceIndexSafe(coronalVp, cMid);

        // Fit images to the viewport without distortion (keeps correct aspect ratio)
        try {
          axialVp.resetCamera?.({ resetPan: true, resetZoom: true, resetToCenter: true });
          sagittalVp.resetCamera?.({ resetPan: true, resetZoom: true, resetToCenter: true });
          coronalVp.resetCamera?.({ resetPan: true, resetZoom: true, resetToCenter: true });
        } catch {
          // ignore
        }

        axialVp.resetCameraForResize?.();
        sagittalVp.resetCameraForResize?.();
        coronalVp.resetCameraForResize?.();

        // One tool group for all MPR planes (required for CrosshairsTool to draw reference lines
        // across viewports and perform linked navigation).
        const mprGroup = ensureToolGroup(MPR_TOOLGROUP_ID, { includeCrosshairs: true });
        mprGroup.addViewport(MPR_AXIAL_VIEWPORT_ID, RENDERING_ENGINE_ID);
        mprGroup.addViewport(MPR_SAGITTAL_VIEWPORT_ID, RENDERING_ENGINE_ID);
        mprGroup.addViewport(MPR_CORONAL_VIEWPORT_ID, RENDERING_ENGINE_ID);

        // Create (or reuse) synchronizers for optional WL/Zoom/Pan syncing across MPR planes.
        // They are globally stored inside Cornerstone Tools, so we create them once and toggle enabled.
        if (!zoomPanSyncRef.current) {
          zoomPanSyncRef.current = synchronizers.createZoomPanSynchronizer(MPR_ZOOMPAN_SYNC_ID);
        }
        if (!voiSyncRef.current) {
          voiSyncRef.current = synchronizers.createVOISynchronizer(MPR_VOI_SYNC_ID, {
            syncInvertState: true,
            syncColormap: true,
          });
        }

        const syncViewports = [
          { renderingEngineId: RENDERING_ENGINE_ID, viewportId: MPR_AXIAL_VIEWPORT_ID },
          { renderingEngineId: RENDERING_ENGINE_ID, viewportId: MPR_SAGITTAL_VIEWPORT_ID },
          { renderingEngineId: RENDERING_ENGINE_ID, viewportId: MPR_CORONAL_VIEWPORT_ID },
        ];

        syncViewports.forEach((vp) => {
          zoomPanSyncRef.current?.add(vp);
          voiSyncRef.current?.add(vp);
        });

        // Enablement is toggled by a separate effect so changing the UI selection
        // doesn't require rebuilding the whole MPR rendering setup.

        renderingEngine.renderViewports([
          MPR_AXIAL_VIEWPORT_ID,
          MPR_SAGITTAL_VIEWPORT_ID,
          MPR_CORONAL_VIEWPORT_ID,
        ]);
      } catch (error) {
        console.error('Error initializing viewer:', error);
      }
    };

    initializeViewer();

    // Cleanup: detach viewport + destroy tool group on unmount
    return () => {
      try {
        if (renderingEngine) {
          // Disable only viewports that exist. When switching modes, the other set of
          // viewports might never have been created, so disabling them would warn.
          const safeDisableViewport = (viewportId: string) => {
            try {
              const vp = (renderingEngine as any).getViewport?.(viewportId);
              if (!vp) return;
              (renderingEngine as any).disableElement?.(viewportId);
            } catch {
              // ignore
            }
          };

          safeDisableViewport(VIEWPORT_ID);
          safeDisableViewport(MPR_AXIAL_VIEWPORT_ID);
          safeDisableViewport(MPR_SAGITTAL_VIEWPORT_ID);
          safeDisableViewport(MPR_CORONAL_VIEWPORT_ID);
          safeDisableViewport(VR_VIEWPORT_ID);
        }

        // Tool groups are created on-demand; destroy to avoid leaking bindings
        try {
          ToolGroupManager.destroyToolGroup(TOOLGROUP_ID);
        } catch {
          // ignore
        }
        try {
          ToolGroupManager.destroyToolGroup(MPR_TOOLGROUP_ID);
        } catch {
          // ignore
        }
        try {
          ToolGroupManager.destroyToolGroup(VR_TOOLGROUP_ID);
        } catch {
          // ignore
        }

        // Destroy synchronizers on unmount to avoid cross-session leakage.
        SynchronizerManager.destroySynchronizer(MPR_ZOOMPAN_SYNC_ID);
        SynchronizerManager.destroySynchronizer(MPR_VOI_SYNC_ID);
        zoomPanSyncRef.current = null;
        voiSyncRef.current = null;
      } catch (err) {
        console.warn('Viewer cleanup failed:', err);
      }
    };
  }, [imageIds, mode]);

  // Stack-only enhancement pipeline. Debounced to keep UI responsive.
  useEffect(() => {
    if (mode !== 'stack') return;

    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;

    const vp: any = engine.getViewport(VIEWPORT_ID);
    if (!vp?.setStack) return;

    const clamp03 = (v: number) => Math.max(0, Math.min(3, v));
    const sharpen = clamp03(Number(enhancements?.sharpen ?? 0));
    const smooth = clamp03(Number(enhancements?.smooth ?? 0));
    const denoise = clamp03(Number(enhancements?.denoise ?? 0));

    const total = sharpen + smooth + denoise;
    // If all are off, reset back to original IDs.
    const needsEnhancement = total > 0;

    let cancelled = false;
    const handle = window.setTimeout(async () => {
      try {
        const currentIndex = typeof vp.getCurrentImageIdIndex === 'function' ? vp.getCurrentImageIdIndex() : 0;

        let nextIds = imageIds;
        if (needsEnhancement) {
          const steps: EnhancementConfig[] = [];
          if (smooth > 0) steps.push({ mode: 'smooth', strength: smooth });
          if (denoise > 0) steps.push({ mode: 'denoise', strength: denoise });
          if (sharpen > 0) steps.push({ mode: 'sharpen', strength: sharpen });

          for (const step of steps) {
            nextIds = await createDerivedImageIds(nextIds, step);
          }
        }

        if (cancelled) return;
        // Some Cornerstone versions return a Promise here; await either way.
        await Promise.resolve(vp.setStack(nextIds));
        if (typeof vp.setImageIdIndex === 'function') {
          const safeIndex = Math.max(0, Math.min(nextIds.length - 1, currentIndex ?? 0));
          vp.setImageIdIndex(safeIndex);
        }
        vp.render?.();
      } catch (e) {
        console.warn('Failed to apply stack enhancements:', e);
      }
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [mode, imageIds, stackInitTick, enhancements?.sharpen, enhancements?.smooth, enhancements?.denoise]);

  // Toggle synchronizer enablement without rebuilding the viewports.
  useEffect(() => {
    const syncEnabled = mode === 'mpr' && mprInteractionTarget === 'all';
    zoomPanSyncRef.current?.setEnabled(syncEnabled);
    voiSyncRef.current?.setEnabled(syncEnabled);
  }, [mode, mprInteractionTarget]);

  // Slider handlers (MPR)
  const setMprSlice = (viewportId: string, sliceIndex: number) => {
    const engine = getRenderingEngine(RENDERING_ENGINE_ID);
    if (!engine) return;
    const vp: any = engine.getViewport(viewportId);
    try {
      if (typeof vp?.setSliceIndex === 'function') {
        vp.setSliceIndex(sliceIndex);
        vp.render?.();
        return;
      }

      if (typeof vp?.setViewReference === 'function' && typeof vp?.getViewReference === 'function') {
        // Generate a correct viewRef from this viewport for the requested slice.
        const viewRef = vp.getViewReference({ sliceIndex });
        if (viewRef) vp.setViewReference(viewRef);
      }

      // BaseVolumeViewport.setViewReference may only update camera; ensure a render.
      vp.render?.();
    } catch (e) {
      // Fail gracefully rather than making the UI feel broken
      console.warn('Failed to set MPR slice:', e);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full border bg-black" style={{ width: '100%', height: '100%' }}>
      {mode === 'stack' ? (
        // Stack mode: single viewport fills the container
        <div ref={stackElementRef} className="w-full h-full" />
      ) : mode === 'vr' ? (
        // Volume rendering (3D): single viewport fills the container
        <div ref={vrElementRef} className="w-full h-full" onContextMenu={(e) => e.preventDefault()} />
      ) : (
        // MPR mode: 2x2 grid like 3D Slicer (Axial, Sagittal, Coronal, empty)
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full min-h-0 min-w-0 gap-px bg-gray-900">
          {/* Axial (top-left) */}
          <div className="relative w-full h-full min-h-0 min-w-0 overflow-hidden bg-black">
            <div className="absolute top-2 left-2 z-10 px-2 py-1 text-xs font-medium text-white bg-black/60 rounded">Axial</div>
            <div
              ref={axialElementRef}
              className="w-full h-full"
              style={{ pointerEvents: mprInteractionTarget === 'all' || mprInteractionTarget === 'axial' ? 'auto' : 'none' }}
            />
            {axialMax > 1 && (
              <div className="absolute bottom-2 left-2 right-2 z-10 px-2 py-2 bg-black/60 rounded">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, axialMax - 1)}
                  value={axialSlice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setAxialSlice(v);
                    setMprSlice(MPR_AXIAL_VIEWPORT_ID, v);
                  }}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Sagittal (top-right) */}
          <div className="relative w-full h-full min-h-0 min-w-0 overflow-hidden bg-black">
            <div className="absolute top-2 left-2 z-10 px-2 py-1 text-xs font-medium text-white bg-black/60 rounded">Sagittal</div>
            <div
              ref={sagittalElementRef}
              className="w-full h-full"
              style={{ pointerEvents: mprInteractionTarget === 'all' || mprInteractionTarget === 'sagittal' ? 'auto' : 'none' }}
            />
            {sagittalMax > 1 && (
              <div className="absolute bottom-2 left-2 right-2 z-10 px-2 py-2 bg-black/60 rounded">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, sagittalMax - 1)}
                  value={sagittalSlice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSagittalSlice(v);
                    setMprSlice(MPR_SAGITTAL_VIEWPORT_ID, v);
                  }}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Coronal (bottom-left) */}
          <div className="relative w-full h-full min-h-0 min-w-0 overflow-hidden bg-black">
            <div className="absolute top-2 left-2 z-10 px-2 py-1 text-xs font-medium text-white bg-black/60 rounded">Coronal</div>
            <div
              ref={coronalElementRef}
              className="w-full h-full"
              style={{ pointerEvents: mprInteractionTarget === 'all' || mprInteractionTarget === 'coronal' ? 'auto' : 'none' }}
            />
            {coronalMax > 1 && (
              <div className="absolute bottom-2 left-2 right-2 z-10 px-2 py-2 bg-black/60 rounded">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, coronalMax - 1)}
                  value={coronalSlice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setCoronalSlice(v);
                    setMprSlice(MPR_CORONAL_VIEWPORT_ID, v);
                  }}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Empty (bottom-right) */}
          <div className="w-full h-full min-h-0 min-w-0 overflow-hidden bg-black" />
        </div>
      )}
    </div>
  );
  }
);

export default Viewer;
