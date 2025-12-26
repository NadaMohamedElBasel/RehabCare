// Jest/runtime-friendly stub for '@cornerstonejs/tools'.
// The real package is ESM with export maps that can be problematic for Jest+CJS.

export const ToolGroupManager = {
  getToolGroup: () => null as any,
  createToolGroup: () => null as any,
  destroyToolGroup: () => undefined,
};

const makeTool = (toolName: string) => ({ toolName });

export const CrosshairsTool = makeTool('Crosshairs');
export const WindowLevelTool = makeTool('WindowLevel');
export const ZoomTool = makeTool('Zoom');
export const PanTool = makeTool('Pan');
export const PlanarRotateTool = makeTool('PlanarRotate');

export const LengthTool = makeTool('Length');
export const AngleTool = makeTool('Angle');
export const RectangleROITool = makeTool('RectangleROI');
export const CircleROITool = makeTool('CircleROI');

export const ArrowAnnotateTool = makeTool('ArrowAnnotate');

// addTool is used in Viewer.tsx
export const addTool = () => undefined;

// Synchronizer exports used in Viewer.tsx
export const SynchronizerManager = {
  destroySynchronizer: () => undefined,
};

export const synchronizers = {
  createZoomPanSynchronizer: () => ({ setEnabled: () => undefined, add: () => undefined }),
  createVOISynchronizer: () => ({ setEnabled: () => undefined, add: () => undefined }),
};

export const ScaleOverlayTool = makeTool('ScaleOverlay');
export const TrackballRotateTool = makeTool('TrackballRotate');
