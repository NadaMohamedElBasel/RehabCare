/**
 * @author: Harsha Attray
 * @description: Custom hook for managing DICOM viewer tool configurations and settings
 * @version: 1.0.0
 * @date: 2025-05-24
 * @license: MIT
 */

import React from 'react';

import {
  WindowLevelTool,
  ZoomTool,
  PanTool,
  TrackballRotateTool,
  PlanarRotateTool,
  LengthTool,
  AngleTool,
  RectangleROITool,
  CircleROITool,
  CrosshairsTool,
  ArrowAnnotateTool,
} from '@cornerstonejs/tools';
import {
  ArrowsPointingOutIcon,
  HandRaisedIcon,
  AdjustmentsHorizontalIcon,
  Square2StackIcon,
  Square3Stack3DIcon,
  CircleStackIcon,
  ArrowPathIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';

export interface ToolConfig {
  name: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  group: 'tools' | 'measurements' | 'annotations';
  modes?: Array<'stack' | 'mpr'>;
}

const CrosshairIcon = (props: React.SVGProps<SVGSVGElement>) =>
  React.createElement(
    'svg',
    { viewBox: '0 0 24 24', stroke: 'currentColor', fill: 'none', strokeWidth: 1.7, ...props },
    React.createElement('circle', { cx: 12, cy: 12, r: 7 }),
    React.createElement('line', { x1: 12, y1: 2, x2: 12, y2: 6, strokeLinecap: 'round' }),
    React.createElement('line', { x1: 12, y1: 18, x2: 12, y2: 22, strokeLinecap: 'round' }),
    React.createElement('line', { x1: 2, y1: 12, x2: 6, y2: 12, strokeLinecap: 'round' }),
    React.createElement('line', { x1: 18, y1: 12, x2: 22, y2: 12, strokeLinecap: 'round' })
  );

export const useToolConfig = () => {
  const tools: ToolConfig[] = [
    {
      name: CrosshairsTool.toolName,
      label: 'Crosshairs',
      icon: CrosshairIcon,
      group: 'tools',
      modes: ['mpr'],
    },
    {
      name: WindowLevelTool.toolName,
      label: 'Window Level',
      icon: AdjustmentsHorizontalIcon,
      group: 'tools',
    },
    {
      name: ZoomTool.toolName,
      label: 'Zoom',
      icon: ArrowsPointingOutIcon,
      group: 'tools',
    },
    {
      name: PanTool.toolName,
      label: 'Pan',
      icon: HandRaisedIcon,
      group: 'tools',
    },
    {
      name: PlanarRotateTool.toolName,
      label: 'Rotate',
      icon: ArrowPathIcon,
      group: 'tools',
    },
    {
      name: TrackballRotateTool.toolName,
      label: '3D Rotate',
      icon: Square3Stack3DIcon,
      group: 'tools',
      modes: ['mpr'],
    },
    {
      name: LengthTool.toolName,
      label: 'Length',
      icon: ArrowPathIcon,
      group: 'measurements',
    },
    {
      name: AngleTool.toolName,
      label: 'Angle',
      icon: Square2StackIcon,
      group: 'measurements',
    },
    {
      name: RectangleROITool.toolName,
      label: 'Rectangle',
      icon: Square3Stack3DIcon,
      group: 'measurements',
    },
    {
      name: CircleROITool.toolName,
      label: 'Circle',
      icon: CircleStackIcon,
      group: 'measurements',
    },
    {
      name: ArrowAnnotateTool.toolName,
      label: 'ROI Marker',
      icon: PencilIcon,
      group: 'annotations',
      // Requested: ROI marker is for stack-only workflow
      modes: ['stack'],
    },
  ];

  return { tools };
}; 