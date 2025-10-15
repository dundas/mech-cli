/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useUIState } from '../contexts/UIStateContext.js';
import { Box, Text } from 'ink';
import { theme } from '../semantic-colors.js';
import type { HistoryItemToolGroup } from '../types.js';
import { useMemo } from 'react';

export const TodoDisplay = () => {
  const { history } = useUIState();

  const inProgressTodoDescription = useMemo(() => {
    if (!history) {
      return null;
    }
    for (let i = history.length - 1; i >= 0; i--) {
      const item = history[i];
      if (item.type !== 'tool_group') {
        continue;
      }
      for (const tool of (item as HistoryItemToolGroup).tools) {
        if (
          tool.name !== 'Write Todos' ||
          typeof tool.resultDisplay !== 'string'
        ) {
          continue;
        }
        for (const line of tool.resultDisplay.split('\n')) {
          const match = line.match(/\[in_progress\]\\s*(.*)/);
          if (match) {
            return match[1];
          }
        }
        console.debug('in progress todo not found!');
        // If we found a Write Todos tool but no in_progress line, don't look further back.
        return null;
      }
    }
    return null;
  }, [history]);

  if (!inProgressTodoDescription) {
    return null;
  }

  return (
    <Box
      borderStyle="round"
      borderColor={theme.border.default}
      flexDirection="column"
      paddingX={1}
      borderBottom={false}
    >
      <Text>In Progress ToDo: {inProgressTodoDescription}</Text>
    </Box>
  );
};
