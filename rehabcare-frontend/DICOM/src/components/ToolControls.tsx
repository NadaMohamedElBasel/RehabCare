import React from 'react';
import { useToolManager } from '../hooks/useToolManager';
import { useToolConfig } from '../hooks/useToolConfig';
import {
  ArrowsPointingOutIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { ViewerRef } from './Viewer';

const TOOLGROUP_ID = 'defaultToolGroup';

interface ToolControlsProps {
  isActive: boolean;
  viewerRef: React.RefObject<ViewerRef>;
  onToggleFullscreen?: () => void;
}

interface Tool {
  name: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const LengthIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.7} {...props}>
    <line x1="4" y1="12" x2="20" y2="12" strokeLinecap="round" />
    <path d="M6 9v6M18 9v6" strokeLinecap="round" />
  </svg>
);

const AngleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.7} {...props}>
    <line x1="12" y1="2" x2="12" y2="22" strokeLinecap="round" />
    <line x1="2" y1="12" x2="22" y2="12" strokeLinecap="round" />
  </svg>
);

const RectangleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.7} {...props}>
    <rect x="3" y="7" width="18" height="10" rx="2" ry="2" />
  </svg>
);

const CircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth={1.7} {...props}>
    <circle cx="12" cy="12" r="10" />
  </svg>
);

const TOOL_ICON_OVERRIDES: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  length: LengthIcon,
  angle: AngleIcon,
  rectangle: RectangleIcon,
  circle: CircleIcon,
};

const ToolControls = ({ isActive, viewerRef, onToggleFullscreen }: ToolControlsProps) => {
  // useToolManager exposes the Cornerstone tool group state & setter (handleToolClick)
  const { activeTool, handleToolClick } = useToolManager();
  // useToolConfig lists the Cornerstone tools (length, angle, rectangle, circle, etc.)
  const { tools } = useToolConfig();

  if (!isActive) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700 mb-2">Tools</div>
      <div className="grid grid-cols-3 gap-2">
        {tools.map((tool: Tool) => {
          const IconComponent = TOOL_ICON_OVERRIDES[tool.name.toLowerCase()] ?? tool.icon;
          return (
            <div key={tool.name} className="group relative">
              <button
                // Clicking fires handleToolClick -> Cornerstone activates this tool
                onClick={() => handleToolClick(tool.name)}
                className={`w-full p-2 rounded-md transition-colors ${
                  activeTool === tool.name
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                <IconComponent className="h-5 w-5 mx-auto" />
              </button>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {tool.label}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        <div className="group relative flex-1">
          <button
            onClick={() => viewerRef.current?.downloadImage()}
            className="w-full p-2 rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mx-auto" />
          </button>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Download Image
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
        {onToggleFullscreen && (
          <div className="group relative flex-1">
            <button
              onClick={onToggleFullscreen}
              className="w-full p-2 rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <ArrowsPointingOutIcon className="h-5 w-5 mx-auto" />
            </button>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Enter Fullscreen
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolControls;