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

  // Which Cornerstone tool group these buttons should control.
  // In MPR mode, each plane can have its own tool group.
  toolGroupId?: string;

  // Viewer mode + optional MPR targeting
  viewMode?: 'stack' | 'mpr';
  onViewModeChange?: (mode: 'stack' | 'mpr') => void;
  mprEnabled?: boolean;
  mprActiveView?: 'axial' | 'sagittal' | 'coronal' | 'all';
  onMprActiveViewChange?: (view: 'axial' | 'sagittal' | 'coronal' | 'all') => void;

  // Doctor notes (stack-only feature)
  notes?: Array<{ id: string; text: string; createdAt: string }>;
  onAddNote?: (text: string) => void;
  onClearNotes?: () => void;

  // Save/export session (annotations + measurements + notes)
  onDownloadSessionJson?: () => void | Promise<void>;
  onClearAnnotations?: () => void;

  // Optional integration into patient medical records
  doctorIdValue?: string;
  onDoctorIdChange?: (value: string) => void;
  patientIdValue?: string;
  onPatientIdChange?: (value: string) => void;
  departmentValue?: string;
  onDepartmentChange?: (value: string) => void;
  onSaveToPatientRecord?: () => void | Promise<void>;
}

interface Tool {
  name: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  group?: 'tools' | 'measurements' | 'annotations';
  modes?: Array<'stack' | 'mpr'>;
}

// Custom SVG glyphs so each measurement tool visually matches its behavior
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
  // Map tool names -> bespoke icons (fallback to Cornerstone defaults otherwise)
  length: LengthIcon,
  angle: AngleIcon,
  rectangle: RectangleIcon,
  circle: CircleIcon,
};

const ToolControls = ({
  isActive,
  viewerRef,
  onToggleFullscreen,
  toolGroupId,
  viewMode = 'stack',
  onViewModeChange,
  mprEnabled = false,
  mprActiveView = 'axial',
  onMprActiveViewChange,
  notes = [],
  onAddNote,
  onClearNotes,
  onDownloadSessionJson,
  onClearAnnotations,
  doctorIdValue,
  onDoctorIdChange,
  patientIdValue,
  onPatientIdChange,
  departmentValue,
  onDepartmentChange,
  onSaveToPatientRecord,
}: ToolControlsProps) => {
  // useToolManager exposes the Cornerstone tool group state & setter (handleToolClick)
  const { activeTool, handleToolClick } = useToolManager(toolGroupId ?? TOOLGROUP_ID);
  // useToolConfig lists the Cornerstone tools (length, angle, rectangle, circle, etc.)
  const { tools } = useToolConfig();

  const toolsForMode = tools.filter((t: Tool) => !t.modes || t.modes.includes(viewMode));
  const toolTools = toolsForMode.filter((t: Tool) => t.group === 'tools');
  const measurementTools = toolsForMode.filter((t: Tool) => t.group === 'measurements');
  const annotationTools = toolsForMode.filter((t: Tool) => t.group === 'annotations');

  const [noteDraft, setNoteDraft] = React.useState('');

  if (!isActive) return null;

  return (
    <div className="space-y-2">
      {/* Viewer mode selector (Stack vs MPR). In MPR, we show which plane receives the tools. */}
      {onViewModeChange && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2">
            <select
              value={viewMode}
              onChange={(e) => onViewModeChange(e.target.value as 'stack' | 'mpr')}
              className="w-full px-3 py-2 text-sm rounded-md bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              disabled={!mprEnabled && viewMode !== 'stack'}
              title={!mprEnabled ? 'MPR requires multiple DICOM slices' : 'Select view mode'}
            >
              <option value="stack">Stack (single plane)</option>
              <option value="mpr" disabled={!mprEnabled}>
                MPR (axial / sagittal / coronal)
              </option>
            </select>

            {viewMode === 'mpr' && onMprActiveViewChange && (
              <select
                value={mprActiveView}
                onChange={(e) => onMprActiveViewChange(e.target.value as 'axial' | 'sagittal' | 'coronal' | 'all')}
                className="w-full px-3 py-2 text-sm rounded-md bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                title="Choose which MPR plane the tools will affect"
              >
                <option value="axial">Apply tools to: Axial</option>
                <option value="sagittal">Apply tools to: Sagittal</option>
                <option value="coronal">Apply tools to: Coronal</option>
                <option value="all">All views (sync WL/Zoom/Pan)</option>
              </select>
            )}
          </div>
        </div>
      )}

      <>
        <div className="text-sm font-medium text-gray-700 mb-2">Tools</div>
        <div className="grid grid-cols-3 gap-2">
          {toolTools.map((tool: Tool) => {
            const IconComponent = TOOL_ICON_OVERRIDES[tool.name.toLowerCase()] ?? tool.icon;
            return (
              <div key={tool.name} className="group relative">
                <button
                  onClick={() => handleToolClick(tool.name)}
                  aria-label={tool.label}
                  title={tool.label}
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

        <div className="text-sm font-medium text-gray-700 mt-4 mb-2">Measurements</div>
        <div className="grid grid-cols-3 gap-2">
          {measurementTools.map((tool: Tool) => {
            const IconComponent = TOOL_ICON_OVERRIDES[tool.name.toLowerCase()] ?? tool.icon;
            return (
              <div key={tool.name} className="group relative">
                <button
                  onClick={() => handleToolClick(tool.name)}
                  aria-label={tool.label}
                  title={tool.label}
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

        {viewMode === 'stack' && (
          <>
            <div className="text-sm font-medium text-gray-700 mt-4 mb-2">Annotations</div>
            <div className="grid grid-cols-3 gap-2">
              {annotationTools.map((tool: Tool) => {
                const IconComponent = TOOL_ICON_OVERRIDES[tool.name.toLowerCase()] ?? tool.icon;
                return (
                  <div key={tool.name} className="group relative">
                    <button
                      onClick={() => handleToolClick(tool.name)}
                      aria-label={tool.label}
                      title={tool.label}
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

            <div className="text-sm font-medium text-gray-700 mt-4 mb-2">Notes</div>
            <div className="space-y-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Doctor notes..."
                className="w-full min-h-[72px] px-3 py-2 text-sm rounded-md bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = noteDraft.trim();
                    if (!text || !onAddNote) return;
                    onAddNote(text);
                    setNoteDraft('');
                  }}
                  className="flex-1 px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={!onAddNote || !noteDraft.trim()}
                  title="Add note"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={onClearNotes}
                  className="px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-60"
                  disabled={!onClearNotes || notes.length === 0}
                  title="Clear all notes"
                >
                  Clear
                </button>
              </div>
              {notes.length > 0 && (
                <div className="space-y-2">
                  {notes
                    .slice()
                    .reverse()
                    .map((n) => (
                      <div
                        key={n.id}
                        className="px-3 py-2 rounded-md bg-gray-50 border border-gray-200 dark:bg-gray-700 dark:border-gray-600"
                      >
                        <div className="text-xs text-gray-500 dark:text-gray-300">{n.createdAt}</div>
                        <div className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{n.text}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </>

      {/* Save/export + integration */}
      <div className="pt-4 space-y-3">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Save / Export</div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDownloadSessionJson}
            disabled={!onDownloadSessionJson}
            className="flex-1 px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-60"
            title="Download annotations + measurements + notes as JSON"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={onClearAnnotations}
            disabled={!onClearAnnotations}
            className="flex-1 px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-60"
            title="Clear all annotations and measurements"
          >
            Clear Marks
          </button>
        </div>

        {onSaveToPatientRecord && (
          <div className="space-y-2">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Save the annotated image + notes into a patient medical record.
            </div>
            <div className="grid grid-cols-1 gap-2">
              <input
                value={doctorIdValue ?? ''}
                onChange={(e) => onDoctorIdChange?.(e.target.value)}
                placeholder="Doctor ID"
                className="w-full px-3 py-2 text-sm rounded-md bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              />
              <input
                value={patientIdValue ?? ''}
                onChange={(e) => onPatientIdChange?.(e.target.value)}
                placeholder="Patient ID"
                className="w-full px-3 py-2 text-sm rounded-md bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              />
              <input
                value={departmentValue ?? ''}
                onChange={(e) => onDepartmentChange?.(e.target.value)}
                placeholder="Department (e.g., Radiology)"
                className="w-full px-3 py-2 text-sm rounded-md bg-white border border-gray-300 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
              />
            </div>
            <button
              type="button"
              onClick={onSaveToPatientRecord}
              className="w-full px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
              title="Save to patient medical records"
            >
              Save To Patient Record
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <div className="group relative flex-1">
          <button
            onClick={() => viewerRef.current?.downloadImage()}
            aria-label="Download Image"
            title="Download Image"
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
              aria-label="Enter Fullscreen"
              title="Enter Fullscreen"
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