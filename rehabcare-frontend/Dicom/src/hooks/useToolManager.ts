
import { useEffect, useState } from 'react';
import {
  ToolGroupManager,
  ZoomTool,
  PanTool,
  WindowLevelTool,
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

    const safeSetPassive = (name: string) => {
      try {
        (toolGroup as any).setToolPassive?.(name);
      } catch {
        // Tool may not exist in this tool group; ignore.
      }
    };

    const safeSetEnabled = (name: string) => {
      try {
        (toolGroup as any).setToolEnabled?.(name);
      } catch {
        // Tool may not exist in this tool group; ignore.
      }
    };

    const safeSetActive = (name: string) => {
      try {
        (toolGroup as any).setToolActive?.(name, { bindings: [{ mouseButton: 1 }] });
      } catch {
        // Tool may not exist in this tool group; ignore.
      }
    };

    // CrosshairsTool requires MPR (multiple orthographic viewports).
    // Enabling/activating it in the stack viewport can crash at runtime.
    if (toolGroupId === TOOLGROUP_ID && toolName === CrosshairsTool.toolName) {
      return;
    }

    // Keep Crosshairs enabled so reference lines stay visible in MPR.
    // (If Crosshairs isn't part of this tool group, these calls are effectively no-ops.)
    if (toolGroupId !== TOOLGROUP_ID) {
      safeSetEnabled(CrosshairsTool.toolName);
    }

    // Deactivate all other tools first
    safeSetPassive(WindowLevelTool.toolName);
    safeSetPassive(ZoomTool.toolName);
    safeSetPassive(PanTool.toolName);
    safeSetPassive(PlanarRotateTool.toolName);
    safeSetPassive(ArrowAnnotateTool.toolName);
    safeSetPassive(LengthTool.toolName);
    safeSetPassive(AngleTool.toolName);
    safeSetPassive(RectangleROITool.toolName);
    safeSetPassive(CircleROITool.toolName);

    // Crosshairs should be passive by default (renders, but doesn't steal left-click)
    if (toolGroupId !== TOOLGROUP_ID) {
      safeSetPassive(CrosshairsTool.toolName);
    }

    // Activate the selected tool
    if (activeTool === toolName) {
      setActiveTool(null);
    } else {
      safeSetActive(toolName);
      setActiveTool(toolName);
    }
  };

  return {
    activeTool,
    handleToolClick,
  };
}; 