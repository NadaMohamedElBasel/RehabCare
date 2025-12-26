import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import {
  RenderingEngine,
  Enums,
  getRenderingEngine,
  StackViewport,
  imageLoader,
  volumeLoader,
  cache,
} from '@cornerstonejs/core';
import {
  addTool,
  ToolGroupManager,
  SynchronizerManager,
  synchronizers,
  ZoomTool,
  PanTool,
  WindowLevelTool,
  TrackballRotateTool,
  PlanarRotateTool,
  LengthTool,
  AngleTool,
  ScaleOverlayTool,
  RectangleROITool,
  CircleROITool,
  CrosshairsTool,
  ArrowAnnotateTool,
} from '@cornerstonejs/tools';
import html2canvas from 'html2canvas';

interface ViewerProps {
  // One or more DICOM imageIds (wadouri:...) - if multiple, they form a volume/series.
  imageIds: string[];

  // stack: single viewport stack rendering
  // mpr: 3 orthographic viewports (axial/sagittal/coronal)
  mode: 'stack' | 'mpr';

  // In MPR, which viewport(s) should receive mouse interactions.
  // - 'axial'|'sagittal'|'coronal' => only that plane is interactive
  // - '3d' => 3D viewport is interactive
  // - 'all' => all planes interactive + optional sync
  mprInteractionTarget?: 'axial' | 'sagittal' | 'coronal' | '3d' | 'all';
}

export interface ViewerRef {
  downloadImage: (format?: string) => void;
  setWindowLevel: (opts: {
    center: number;
    width: number;
    target?: 'stack' | 'axial' | 'sagittal' | 'coronal' | '3d' | 'all';
  }) => void;
}

const VIEWPORT_ID = 'defaultViewport';
const RENDERING_ENGINE_ID = 'defaultRenderingEngine';
const TOOLGROUP_ID = 'defaultToolGroup';

const MPR_AXIAL_VIEWPORT_ID = 'mprAxialViewport';
const MPR_SAGITTAL_VIEWPORT_ID = 'mprSagittalViewport';
const MPR_CORONAL_VIEWPORT_ID = 'mprCoronalViewport';
const MPR_3D_VIEWPORT_ID = 'mpr3dViewport';

const MPR_TOOLGROUP_ID = 'mprToolGroup';
const MPR_3D_TOOLGROUP_ID = 'mpr3dToolGroup';

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
  addTool(TrackballRotateTool);
  addTool(PlanarRotateTool);
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
  toolGroup.addTool(TrackballRotateTool.toolName);
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

function ensure3DToolGroup() {
  let toolGroup = ToolGroupManager.getToolGroup(MPR_3D_TOOLGROUP_ID);
  if (toolGroup) return toolGroup;

  toolGroup = ToolGroupManager.createToolGroup(MPR_3D_TOOLGROUP_ID);
  if (!toolGroup) {
    throw new Error(`Failed to create tool group: ${MPR_3D_TOOLGROUP_ID}`);
  }

  toolGroup.addTool(TrackballRotateTool.toolName);
  toolGroup.addTool(ZoomTool.toolName);
  toolGroup.addTool(PanTool.toolName);
  toolGroup.addTool(WindowLevelTool.toolName);

  // Default interaction: 3D rotate on left drag
  toolGroup.setToolActive(TrackballRotateTool.toolName, { bindings: [{ mouseButton: 1 }] });
  return toolGroup;
}

const Viewer = forwardRef<ViewerRef, ViewerProps>(({ imageIds, mode, mprInteractionTarget = 'axial' }, ref) => {
  // Root container used for screenshots (captures stack OR all MPR planes)
  const containerRef = useRef<HTMLDivElement>(null);

  // Cornerstone viewport host elements
  const stackElementRef = useRef<HTMLDivElement>(null);
  const axialElementRef = useRef<HTMLDivElement>(null);
  const sagittalElementRef = useRef<HTMLDivElement>(null);
  const coronalElementRef = useRef<HTMLDivElement>(null);
  const volume3dElementRef = useRef<HTMLDivElement>(null);

  // Slice sliders (MPR): each orthographic viewport can scroll independently
  const [axialMax, setAxialMax] = useState(0);
  const [sagittalMax, setSagittalMax] = useState(0);
  const [coronalMax, setCoronalMax] = useState(0);
  const [axialSlice, setAxialSlice] = useState(0);
  const [sagittalSlice, setSagittalSlice] = useState(0);
  const [coronalSlice, setCoronalSlice] = useState(0);

  const zoomPanSyncRef = useRef<ReturnType<typeof synchronizers.createZoomPanSynchronizer> | null>(null);
  const voiSyncRef = useRef<ReturnType<typeof synchronizers.createVOISynchronizer> | null>(null);

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
        applyToViewport(MPR_3D_VIEWPORT_ID);
        return;
      }

      if (target === 'axial') applyToViewport(MPR_AXIAL_VIEWPORT_ID);
      if (target === 'sagittal') applyToViewport(MPR_SAGITTAL_VIEWPORT_ID);
      if (target === 'coronal') applyToViewport(MPR_CORONAL_VIEWPORT_ID);
      if (target === '3d') applyToViewport(MPR_3D_VIEWPORT_ID);
    },
  }));

  useEffect(() => {
    // Wait for the right DOM nodes to exist before initializing viewports
    const stackEl = stackElementRef.current;
    const axialEl = axialElementRef.current;
    const sagittalEl = sagittalElementRef.current;
    const coronalEl = coronalElementRef.current;
    const volume3dEl = volume3dElementRef.current;

    if (mode === 'stack' && !stackEl) return;
    if (mode === 'mpr' && (!axialEl || !sagittalEl || !coronalEl || !volume3dEl)) return;

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
          viewport.setStack(imageIds);
          viewport.setProperties({
            voiRange: {
              lower: windowCenter - windowWidth / 2,
              upper: windowCenter + windowWidth / 2,
            },
          });
          viewport.render();
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
          {
            viewportId: MPR_3D_VIEWPORT_ID,
            element: volume3dEl!,
            type: Enums.ViewportType.VOLUME_3D,
            defaultOptions: { parallelProjection: false },
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
        const volume3dVp = renderingEngine.getViewport(MPR_3D_VIEWPORT_ID) as any;

        await Promise.all([
          axialVp.setVolumes([{ volumeId: MPR_VOLUME_ID }], true),
          sagittalVp.setVolumes([{ volumeId: MPR_VOLUME_ID }], true),
          coronalVp.setVolumes([{ volumeId: MPR_VOLUME_ID }], true),
          volume3dVp.setVolumes([{ volumeId: MPR_VOLUME_ID }], true),
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

          // VolumeViewport3D needs its own VOI + preset to avoid rendering black by default.
          // Use a standard MIP preset for a 3D Slicer-like first impression.
          try {
            volume3dVp.resetProperties?.();
          } catch {
            // ignore
          }
          volume3dVp.setProperties?.({ voiRange, preset: 'CT-MIP' });
          volume3dVp.resetCamera?.({ resetPan: true, resetZoom: true, resetToCenter: true });
          volume3dVp.render?.();
        } catch (e) {
          console.warn('Failed to set initial MPR VOI:', e);
        }

        // Initialize sliders to the middle slice for each plane
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

        // IMPORTANT: setViewReference needs a fully compatible viewRef.
        // We generate it from the viewport itself so it includes FrameOfReferenceUID + viewPlaneNormal.
        axialVp.setViewReference?.(axialVp.getViewReference?.({ sliceIndex: aMid }));
        sagittalVp.setViewReference?.(sagittalVp.getViewReference?.({ sliceIndex: sMid }));
        coronalVp.setViewReference?.(coronalVp.getViewReference?.({ sliceIndex: cMid }));

        // Fit images to the viewport without distortion (keeps correct aspect ratio)
        axialVp.resetCameraForResize?.();
        sagittalVp.resetCameraForResize?.();
        coronalVp.resetCameraForResize?.();
        volume3dVp.resetCameraForResize?.();

        // One tool group for all MPR planes (required for CrosshairsTool to draw reference lines
        // across viewports and perform linked navigation).
        const mprGroup = ensureToolGroup(MPR_TOOLGROUP_ID, { includeCrosshairs: true });
        mprGroup.addViewport(MPR_AXIAL_VIEWPORT_ID, RENDERING_ENGINE_ID);
        mprGroup.addViewport(MPR_SAGITTAL_VIEWPORT_ID, RENDERING_ENGINE_ID);
        mprGroup.addViewport(MPR_CORONAL_VIEWPORT_ID, RENDERING_ENGINE_ID);

        // Dedicated 3D tool group (TrackballRotate + Zoom/Pan/WL)
        const volume3dGroup = ensure3DToolGroup();
        volume3dGroup.addViewport(MPR_3D_VIEWPORT_ID, RENDERING_ENGINE_ID);

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
          MPR_3D_VIEWPORT_ID,
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
          safeDisableViewport(MPR_3D_VIEWPORT_ID);
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
          ToolGroupManager.destroyToolGroup(MPR_3D_TOOLGROUP_ID);
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
    if (!vp?.setViewReference || !vp?.getViewReference) return;
    try {
      // Generate a correct viewRef from this viewport for the requested slice.
      const viewRef = vp.getViewReference({ sliceIndex });
      vp.setViewReference(viewRef);
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
      ) : (
        // MPR mode: 4-panel layout (3D + 3 planes)
        <div className="grid grid-cols-2 grid-rows-2 w-full h-full min-h-0 min-w-0 gap-px bg-gray-900">
          <div className="relative w-full h-full min-h-0 min-w-0 overflow-hidden bg-black">
            <div className="absolute top-2 left-2 z-10 px-2 py-1 text-xs font-medium text-white bg-black/60 rounded">3D</div>
            <div
              ref={volume3dElementRef}
              className="w-full h-full"
              style={{ pointerEvents: mprInteractionTarget === '3d' || mprInteractionTarget === 'all' ? 'auto' : 'none' }}
            />
          </div>

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

        </div>
      )}
    </div>
  );
});

export default Viewer;
