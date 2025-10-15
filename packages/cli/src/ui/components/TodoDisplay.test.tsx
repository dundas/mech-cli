/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { TodoDisplay } from './TodoDisplay.js';
import { useUIState, type UIState } from '../contexts/UIStateContext.js';
import { ToolCallStatus, type HistoryItem } from '../types.js';

// Mock the useUIState hook
vi.mock('../contexts/UIStateContext.js', () => ({
  useUIState: vi.fn(),
}));

const mockUseUIState = vi.mocked(useUIState);

const createMockUIState = (history: UIState['history'] = []): UIState =>
  ({
    history,
  }) as UIState;

describe('<TodoDisplay />', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when history is empty', () => {
    mockUseUIState.mockReturnValue(createMockUIState());
    const { lastFrame } = render(<TodoDisplay />);
    expect(lastFrame()).toBe('');
  });

  it('renders nothing when no "Write Todos" tool is in history', () => {
    const history = [
      {
        id: 1,
        type: 'tool_group',
        tools: [
          {
            callId: '1',
            name: 'read_file',
            description: 'Read a file',
            status: ToolCallStatus.Success,
            resultDisplay: 'file content',
          },
        ],
      },
    ] as unknown as HistoryItem[];
    mockUseUIState.mockReturnValue(createMockUIState(history));
    const { lastFrame } = render(<TodoDisplay />);
    expect(lastFrame()).toBe('');
  });

  it('renders nothing when "Write Todos" tool has no in_progress item', () => {
    const history = [
      {
        id: 1,
        type: 'tool_group',
        tools: [
          {
            callId: '1',
            name: 'Write Todos',
            description: 'Write a todo list',
            status: ToolCallStatus.Success,
            resultDisplay: `
- [pending] Task 1
- [completed] Task 2
`,
          },
        ],
      },
    ] as unknown as HistoryItem[];
    mockUseUIState.mockReturnValue(createMockUIState(history));
    const { lastFrame } = render(<TodoDisplay />);
    expect(lastFrame()).toBe('');
  });

  it('renders the in_progress todo item and matches snapshot', () => {
    const history = [
      {
        id: 1,
        type: 'tool_group',
        tools: [
          {
            callId: '1',
            name: 'Write Todos',
            description: 'Write a todo list',
            status: ToolCallStatus.Success,
            resultDisplay: `
- [pending] Task A
- [in_progress] Task B
- [completed] Task C
`,
          },
        ],
      },
    ] as unknown as HistoryItem[];
    mockUseUIState.mockReturnValue(createMockUIState(history));
    const { lastFrame } = render(<TodoDisplay />);
    expect(lastFrame()).toMatchSnapshot();
  });

  it('renders the latest in_progress todo when multiple "Write Todos" tools exist', () => {
    const history = [
      {
        id: 1,
        type: 'tool_group',
        tools: [
          {
            callId: '1',
            name: 'Write Todos',
            description: 'Old todo list',
            status: ToolCallStatus.Success,
            resultDisplay: `
- [in_progress] Old Task
`,
          },
        ],
      },
      {
        id: 2,
        type: 'tool_group',
        tools: [
          {
            callId: '2',
            name: 'Write Todos',
            description: 'New todo list',
            status: ToolCallStatus.Success,
            resultDisplay: `
- [pending] New Task 1
- [in_progress] New Task 2
`,
          },
        ],
      },
    ] as unknown as HistoryItem[];
    mockUseUIState.mockReturnValue(createMockUIState(history));
    const { lastFrame } = render(<TodoDisplay />);
    expect(lastFrame()).toMatchSnapshot();
  });
});
