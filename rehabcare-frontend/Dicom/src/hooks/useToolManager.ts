
import { useEffect, useState } from 'react';
import {
  ToolGroupManager,
  ZoomTool,
  PanTool,
  WindowLevelTool,
  TrackballRotateTool,
  PlanarRotateTool,
  ArrowAnnotateTool,
  LengthTool,
  AngleTool,
  RectangleROITool,
  CircleROITool,
  CrosshairsTool,
} from '@cornerstonejs/tools';

const TOOLGROUP_ID = 'defaultToolGroup';

export const useToolManager = (toolGroupId: string = TOOLGROUP_ID) => {
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // If the consumer switches which viewport/tool group they are controlling (e.g., MPR plane),
  // reset the local UI selection so we don't show a stale "active" state.
  useEffect(() => {
    setActiveTool(null);
  }, [toolGroupId]);

  const handleToolClick = (toolName: string) => {
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    if (!toolGroup) return;

    // CrosshairsTool requires MPR (multiple orthographic viewports).
    // Enabling/activating it in the stack viewport can crash at runtime.
    if (toolGroupId === TOOLGROUP_ID && toolName === CrosshairsTool.toolName) {
      return;
    }

    // Keep Crosshairs enabled so reference lines stay visible in MPR.
    // (If Crosshairs isn't part of this tool group, these calls are effectively no-ops.)
    if (toolGroupId !== TOOLGROUP_ID) {
      toolGroup.setToolEnabled(CrosshairsTool.toolName);
    }

    // Deactivate all other tools first
    toolGroup.setToolPassive(WindowLevelTool.toolName);
    toolGroup.setToolPassive(ZoomTool.toolName);
    toolGroup.setToolPassive(PanTool.toolName);
    toolGroup.setToolPassive(TrackballRotateTool.toolName);
    toolGroup.setToolPassive(PlanarRotateTool.toolName);
    toolGroup.setToolPassive(ArrowAnnotateTool.toolName);
    toolGroup.setToolPassive(LengthTool.toolName);
    toolGroup.setToolPassive(AngleTool.toolName);
    toolGroup.setToolPassive(RectangleROITool.toolName);
    toolGroup.setToolPassive(CircleROITool.toolName);

    // Crosshairs should be passive by default (renders, but doesn't steal left-click)
    if (toolGroupId !== TOOLGROUP_ID) {
      toolGroup.setToolPassive(CrosshairsTool.toolName);
    }

    // Activate the selected tool
    if (activeTool === toolName) {
      setActiveTool(null);
    } else {
      toolGroup.setToolActive(toolName, { bindings: [{ mouseButton: 1 }] });
      setActiveTool(toolName);
    }
  };

  return {
    activeTool,
    handleToolClick,
  };
}; 