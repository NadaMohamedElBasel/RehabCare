import { useEffect, useState, useRef } from 'react';
import Upload from '@components/Upload';
import Viewer, { ViewerRef } from '@components/Viewer';
// import MetadataPanel from '@components/MetadataPanel';
import ToolControls from '@components/ToolControls';
import SampleSelector from '@components/SampleSelector';
import FloatingTools from '@components/FloatingTools';
import { initCornerstone } from '@lib/cornerstoneSetup';
import { saveDicom, clearStorage } from '@lib/storage';
import { useDarkMode } from './hooks/useDarkMode';
import { 
  DocumentTextIcon, 
  PhotoIcon,
  WrenchScrewdriverIcon,
  InformationCircleIcon,
  XMarkIcon,
  SunIcon,
  MoonIcon,
  ArrowsPointingInIcon,
} from '@heroicons/react/24/outline';
import React from 'react';
import { createDerivedImageIds, type EnhancementMode } from '@lib/derivedImageLoader';
import { imageLoader } from '@cornerstonejs/core';

const App = () => {
  const [sourceImageIds, setSourceImageIds] = useState<string[] | null>(null);
  const [imageIds, setImageIds] = useState<string[] | null>(null);
  const [metadata, setMetadata] = useState<Record<string, string>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'stack' | 'mpr'>('stack');
  const [mprActiveView, setMprActiveView] = useState<'axial' | 'sagittal' | 'coronal' | 'all'>('axial');
  const [enhancementMode, setEnhancementMode] = useState<EnhancementMode>('none');
  const [enhancementStrength, setEnhancementStrength] = useState(0.6);
  const [enhancementBusy, setEnhancementBusy] = useState(false);
  const [wlCenter, setWlCenter] = useState<number>(0);
  const [wlWidth, setWlWidth] = useState<number>(1);
  const [wlMin, setWlMin] = useState<number>(0);
  const [wlMax, setWlMax] = useState<number>(1);
  const [doctorNotes, setDoctorNotes] = useState<Array<{ id: string; text: string; createdAt: string }>>([]);
  const viewerRef = useRef<ViewerRef>(null);
  const objectUrlsRef = useRef<string[]>([]);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  useEffect(() => {
    initCornerstone();
  }, []);

  const handleUpload = async (files: File[]) => {
    if (!files.length) return;

    // Revoke any previous object URLs to avoid leaking memory
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];

    // Create wadouri imageIds for all uploaded files (supports multi-slice series)
    const objectUrls = files.map((f) => URL.createObjectURL(f));
    objectUrlsRef.current = objectUrls;
    const nextImageIds = objectUrls.map((u) => `wadouri:${u}`);
    setSourceImageIds(nextImageIds);
    setImageIds(nextImageIds);
    setEnhancementMode('none');

    // If user uploads a single DICOM, stay in stack mode by default.
    // If they upload multiple slices, keep the current mode but MPR becomes meaningful.
    if (nextImageIds.length < 2) {
      setViewMode('stack');
      setMprActiveView('axial');
    }

    // Save the file to IndexedDB
    try {
      // Store each uploaded slice by filename
      await Promise.all(files.map((f) => saveDicom(f)));
    } catch (error) {
      console.error('Failed to save file to storage:', error);
    }

    const worker = new Worker(new URL('./workers/dicomWorker.ts', import.meta.url), {
      type: 'module',
    });

    // Parse metadata from the first file only (fast + still useful)
    worker.postMessage(files[0]);
    worker.onmessage = (e) => {
      setMetadata(e.data.metadata);
      worker.terminate();
    };
  };

  useEffect(() => {
    const run = async () => {
      if (!sourceImageIds) return;
      if (enhancementMode === 'none') {
        setImageIds(sourceImageIds);
        return;
      }
      setEnhancementBusy(true);
      try {
        const derived = await createDerivedImageIds(sourceImageIds, {
          mode: enhancementMode,
          strength: enhancementStrength,
        });
        setImageIds(derived);
      } catch (e) {
        console.warn('Failed to apply enhancement filter:', e);
        setImageIds(sourceImageIds);
        setEnhancementMode('none');
      } finally {
        setEnhancementBusy(false);
      }
    };
    run();
  }, [sourceImageIds, enhancementMode, enhancementStrength]);

  // Compute default leveling (window/level) range from the first slice.
  useEffect(() => {
    const run = async () => {
      if (!imageIds?.length) return;
      try {
        const firstImage: any = await imageLoader.loadImage(imageIds[0]);
        const pixelData = firstImage.getPixelData?.();

        if (!pixelData?.length) return;

        let min = Infinity;
        let max = -Infinity;
        for (let i = 0; i < pixelData.length; i++) {
          const v = pixelData[i];
          if (v < min) min = v;
          if (v > max) max = v;
        }

        const defaultCenter = Number(firstImage.windowCenter || (min + max) / 2);
        const defaultWidth = Math.max(1, Number(firstImage.windowWidth || (max - min)));

        setWlMin(Number.isFinite(min) ? min : 0);
        setWlMax(Number.isFinite(max) ? max : 1);
        setWlCenter(defaultCenter);
        setWlWidth(defaultWidth);
      } catch (e) {
        console.warn('Failed to compute default window/level:', e);
      }
    };
    run();
  }, [imageIds]);

  // Apply leveling whenever the target or values change.
  useEffect(() => {
    if (!imageIds?.length) return;
    viewerRef.current?.setWindowLevel({
      center: wlCenter,
      width: wlWidth,
      target: viewMode === 'mpr' ? mprActiveView : 'stack',
    });
  }, [imageIds, viewMode, mprActiveView, wlCenter, wlWidth]);

  const handleClear = async () => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];
    setSourceImageIds(null);
    setImageIds(null);
    setMetadata({});
    setIsFullscreen(false);
    setViewMode('stack');
    setMprActiveView('axial');
    setEnhancementMode('none');
    setDoctorNotes([]);

    // Clear the IndexedDB storage
    try {
      await clearStorage();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const isMprPossible = (imageIds?.length ?? 0) >= 2;

  const activeToolGroupId = viewMode === 'mpr' ? 'mprToolGroup' : 'defaultToolGroup';

  const addDoctorNote = (text: string) => {
    const id = (globalThis.crypto as any)?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const createdAt = new Date().toLocaleString();
    setDoctorNotes((prev) => [...prev, { id, text, createdAt }]);
  };

  const clearDoctorNotes = () => setDoctorNotes([]);

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Sidebar - Hidden in fullscreen mode */}
      {!isFullscreen && (
        <div className="w-72 bg-white shadow-lg flex flex-col dark:bg-gray-800 dark:text-gray-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2 dark:text-gray-200">
              <DocumentTextIcon className="h-6 w-6 text-blue-500" />
              DICOM Viewer
            </h1>
            <button
              onClick={toggleDarkMode}
              className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-500 dark:hover:text-gray-400"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? (
                <SunIcon className="h-6 w-6" />
              ) : (
                <MoonIcon className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Upload Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <PhotoIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                Upload DICOM
              </div>
              <Upload onUpload={handleUpload} />
            </div>

            {/* Sample Files Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <DocumentTextIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                Sample Files
              </div>
              <SampleSelector onSelect={handleUpload} onClear={handleClear} isActive={true} />
            </div>

            {/* Tools Section */}
            {imageIds && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <WrenchScrewdriverIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  Tools
                </div>
                <ToolControls
                  isActive={!!imageIds}
                  viewerRef={viewerRef}
                  onToggleFullscreen={toggleFullscreen}
                  toolGroupId={activeToolGroupId}
                  viewMode={viewMode}
                  onViewModeChange={(mode) => {
                    if (mode === 'mpr' && !isMprPossible) return;
                    setViewMode(mode);
                  }}
                  mprEnabled={isMprPossible}
                  mprActiveView={mprActiveView}
                  onMprActiveViewChange={setMprActiveView}

                  // Stack-only notes feature
                  notes={doctorNotes}
                  onAddNote={viewMode === 'stack' ? addDoctorNote : undefined}
                  onClearNotes={viewMode === 'stack' ? clearDoctorNotes : undefined}
                />

                {/* Image enhancement controls (basic clinical filters) */}
                <div className="pt-2 space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Image Enhancement</div>
                  <select
                    value={enhancementMode}
                    onChange={(e) => setEnhancementMode(e.target.value as EnhancementMode)}
                    className="w-full px-3 py-2 text-sm rounded-md bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                    disabled={enhancementBusy}
                    title="Apply a basic enhancement filter"
                  >
                    <option value="none">None</option>
                    <option value="sharpen">Sharpen</option>
                    <option value="smooth">Smooth</option>
                    <option value="denoise">Noise Reduction</option>
                  </select>

                  {enhancementMode !== 'none' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Strength</span>
                        <span>{Math.round(enhancementStrength * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={enhancementStrength}
                        onChange={(e) => setEnhancementStrength(Number(e.target.value))}
                        className="w-full"
                        disabled={enhancementBusy}
                      />
                    </div>
                  )}
                </div>

                {/* Leveling (Window/Level) */}
                <div className="pt-4 space-y-2">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Leveling (Window/Level)</div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Center</span>
                      <span>{Math.round(wlCenter)}</span>
                    </div>
                    <input
                      type="range"
                      min={wlMin}
                      max={wlMax}
                      step={1}
                      value={wlCenter}
                      onChange={(e) => setWlCenter(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Width</span>
                      <span>{Math.round(wlWidth)}</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={Math.max(1, Math.round((wlMax - wlMin) * 2))}
                      step={1}
                      value={wlWidth}
                      onChange={(e) => setWlWidth(Math.max(1, Number(e.target.value)))}
                      className="w-full"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!imageIds?.length) return;
                      try {
                        const firstImage: any = await imageLoader.loadImage(imageIds[0]);
                        const pixelData = firstImage.getPixelData?.();
                        if (!pixelData?.length) return;

                        let min = Infinity;
                        let max = -Infinity;
                        for (let i = 0; i < pixelData.length; i++) {
                          const v = pixelData[i];
                          if (v < min) min = v;
                          if (v > max) max = v;
                        }

                        const defaultCenter = Number(firstImage.windowCenter || (min + max) / 2);
                        const defaultWidth = Math.max(1, Number(firstImage.windowWidth || (max - min)));
                        setWlCenter(defaultCenter);
                        setWlWidth(defaultWidth);
                      } catch (e) {
                        console.warn('Failed to reset window/level:', e);
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    title="Reset to default window/level"
                  >
                    Reset Leveling
                  </button>
                </div>
              </div>
            )}

            {/* Metadata Section */}
            
            
            {/* UNUSED */}
            
            
            
            {/* {Object.keys(metadata).length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <InformationCircleIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  Metadata
                </div>
                <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-700">
                  <MetadataPanel metadata={metadata} />
                </div>
              </div>
            )} */}
          </div>

          {/* Footer */}
          {imageIds && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleClear}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors dark:text-red-300 dark:bg-red-900 dark:hover:bg-red-800"
              >
                <XMarkIcon className="h-5 w-5" />
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Viewer */}
      <div className={`flex-1 p-4 ${isFullscreen ? 'p-0' : ''}`}>
          {imageIds ? (
          <div className={`h-full bg-white rounded-lg shadow-lg overflow-hidden dark:bg-gray-800 ${isFullscreen ? 'rounded-none' : ''}`}>
            <div className="relative h-full">
              <Viewer
                imageIds={imageIds}
                mode={viewMode}
                ref={viewerRef}
                mprInteractionTarget={viewMode === 'mpr' ? mprActiveView : undefined}
              />
              {isFullscreen && (
                <button
                  onClick={toggleFullscreen}
                  className="absolute top-4 right-4 p-2 rounded-md bg-white/80 hover:bg-white text-gray-600 dark:bg-gray-800/80 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors"
                  title="Exit Fullscreen"
                >
                  <ArrowsPointingInIcon className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-white rounded-lg shadow-lg dark:bg-gray-800">
            <div className="text-center">
              <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4 dark:text-gray-500" />
              <div className="text-gray-500 text-lg dark:text-gray-400">
                Upload a DICOM file to begin
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Tools in Fullscreen Mode */}
      {isFullscreen && imageIds && (
        <FloatingTools
          isActive={isFullscreen}
          viewerRef={viewerRef}
          onExitFullscreen={toggleFullscreen}
          toolGroupId={activeToolGroupId}
        />
      )}
    </div>
  );
};

export default App;
