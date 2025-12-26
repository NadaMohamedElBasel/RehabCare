import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ToolControls from '../ToolControls';
import { useToolManager } from '../../hooks/useToolManager';
import { useToolConfig } from '../../hooks/useToolConfig';

// Mock the custom hooks
jest.mock('../../hooks/useToolManager');
jest.mock('../../hooks/useToolConfig');

describe('ToolControls', () => {
  const mockHandleToolClick = jest.fn();
  const mockTools = [
    { name: 'WindowLevel', label: 'Window Level', group: 'tools', icon: () => <div>Window Level Icon</div> },
    { name: 'Zoom', label: 'Zoom', group: 'tools', icon: () => <div>Zoom Icon</div> },
    { name: 'Length', label: 'Length', group: 'measurements', icon: () => <div>Length Icon</div> },
    { name: 'ArrowAnnotate', label: 'ROI Marker', group: 'annotations', modes: ['stack'], icon: () => <div>ROI Icon</div> },
    // Add other tools if needed for broader test coverage, though these two suffice for basic tests
  ];
  
  // Mock viewerRef
  const mockViewerRef = {
    current: {
      downloadImage: jest.fn(),
      setWindowLevel: jest.fn(),
      captureImageDataUrl: jest.fn(),
      getAllAnnotations: jest.fn(),
      removeAllAnnotations: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useToolManager as jest.Mock).mockReturnValue({
      activeTool: null,
      handleToolClick: mockHandleToolClick,
    });
    (useToolConfig as jest.Mock).mockReturnValue({
      tools: mockTools,
    });
  });

  it('should not render when isActive is false', () => {
    render(<ToolControls isActive={false} viewerRef={mockViewerRef} />);
    expect(screen.queryByText('Tools')).not.toBeInTheDocument();
  });

  it('should render when isActive is true', () => {
    render(<ToolControls isActive={true} viewerRef={mockViewerRef} />);
    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Measurements')).toBeInTheDocument();
    expect(screen.getByText('Annotations')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('should render all tools', () => {
    render(<ToolControls isActive={true} viewerRef={mockViewerRef} />);

    expect(screen.getByLabelText('Window Level')).toBeInTheDocument();
    expect(screen.getByLabelText('Zoom')).toBeInTheDocument();
    expect(screen.getByLabelText('Length')).toBeInTheDocument();
    expect(screen.getByLabelText('ROI Marker')).toBeInTheDocument();
  });

  it('should call handleToolClick when a tool is clicked', () => {
    render(<ToolControls isActive={true} viewerRef={mockViewerRef} />);

    fireEvent.click(screen.getByLabelText('Window Level'));
    expect(mockHandleToolClick).toHaveBeenCalledWith('WindowLevel');
  });

  it('should apply active styles to the selected tool', () => {
    (useToolManager as jest.Mock).mockReturnValue({
      activeTool: 'WindowLevel',
      handleToolClick: mockHandleToolClick,
    });

    render(<ToolControls isActive={true} viewerRef={mockViewerRef} />);

    const windowLevelButton = screen.getByLabelText('Window Level');
    expect(windowLevelButton.className).toContain('bg-blue-100');
    expect(windowLevelButton.className).toContain('text-blue-600');
  });

  it('should apply inactive styles to unselected tools', () => {
    (useToolManager as jest.Mock).mockReturnValue({
      activeTool: 'WindowLevel',
      handleToolClick: mockHandleToolClick,
    });

    render(<ToolControls isActive={true} viewerRef={mockViewerRef} />);

    const zoomButton = screen.getByLabelText('Zoom');
    expect(zoomButton.className).toContain('text-gray-600');
    expect(zoomButton.className).not.toContain('bg-blue-100');
  });

  it('should call downloadImage on viewerRef when Download button is clicked', () => {
    render(<ToolControls isActive={true} viewerRef={mockViewerRef} />);

    const downloadButton = screen.getByLabelText('Download Image');
    fireEvent.click(downloadButton);

    expect(mockViewerRef.current.downloadImage).toHaveBeenCalled();
  });

  it('should add and clear notes via callbacks', () => {
    const onAddNote = jest.fn();
    const onClearNotes = jest.fn();

    render(
      <ToolControls
        isActive={true}
        viewerRef={mockViewerRef}
        notes={[{ id: '1', text: 'Existing note', createdAt: 'now' }]}
        onAddNote={onAddNote}
        onClearNotes={onClearNotes}
      />
    );

    expect(screen.getByText('Existing note')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Doctor notes...'), { target: { value: 'New note' } });
    fireEvent.click(screen.getByText('Add'));
    expect(onAddNote).toHaveBeenCalledWith('New note');

    fireEvent.click(screen.getByText('Clear'));
    expect(onClearNotes).toHaveBeenCalled();
  });
}); 