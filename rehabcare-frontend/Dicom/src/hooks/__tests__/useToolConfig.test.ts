import { renderHook } from '@testing-library/react';
import { useToolConfig } from '../useToolConfig';

describe('useToolConfig', () => {
  it('should return all tools with correct configuration', () => {
    const { result } = renderHook(() => useToolConfig());
    const { tools } = result.current;

    expect(tools).toHaveLength(10);

    expect(tools[0]).toMatchObject({ name: 'Crosshairs', label: 'Crosshairs', group: 'tools', modes: ['mpr'] });
    expect(tools[1]).toMatchObject({ name: 'WindowLevel', label: 'Window Level', group: 'tools' });
    expect(tools[2]).toMatchObject({ name: 'Zoom', label: 'Zoom', group: 'tools' });
    expect(tools[3]).toMatchObject({ name: 'Pan', label: 'Pan', group: 'tools' });
    expect(tools[4]).toMatchObject({ name: 'PlanarRotate', label: 'Rotate', group: 'tools' });
    expect(tools[5]).toMatchObject({ name: 'Length', label: 'Length', group: 'measurements' });
    expect(tools[6]).toMatchObject({ name: 'Angle', label: 'Angle', group: 'measurements' });
    expect(tools[7]).toMatchObject({ name: 'RectangleROI', label: 'Rectangle', group: 'measurements' });
    expect(tools[8]).toMatchObject({ name: 'CircleROI', label: 'Circle', group: 'measurements' });
    expect(tools[9]).toMatchObject({ name: 'ArrowAnnotate', label: 'ROI Marker', group: 'annotations', modes: ['stack', 'mpr'] });
  });

  it('should maintain consistent tool order', () => {
    const { result } = renderHook(() => useToolConfig());
    const { tools } = result.current;

    const toolNames = tools.map(tool => tool.name);
    expect(toolNames).toEqual([
      'Crosshairs',
      'WindowLevel',
      'Zoom',
      'Pan',
      'PlanarRotate',
      'Length',
      'Angle',
      'RectangleROI',
      'CircleROI',
      'ArrowAnnotate',
    ]);
  });
}); 