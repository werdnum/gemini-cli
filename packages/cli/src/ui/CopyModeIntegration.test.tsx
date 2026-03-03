/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../test-utils/render.js';
import { ThinkingMessage } from './components/messages/ThinkingMessage.js';
import { ToolGroupMessage } from './components/messages/ToolGroupMessage.js';
import { CoreToolCallStatus } from '@google/gemini-cli-core';

describe('Copy Mode Alignment Regression', () => {
  const terminalWidth = 80;

  describe('ThinkingMessage', () => {
    const thought = {
      subject: 'Thinking summary',
      description: 'Thinking body',
    };

    it('aligns to column 4 in normal mode', async () => {
      const { lastFrame, waitUntilReady } = renderWithProviders(
        <ThinkingMessage thought={thought} />,
        { width: terminalWidth, uiState: { copyModeEnabled: false } },
      );
      await waitUntilReady();
      const frame = lastFrame();
      // summary: 1 (marginLeft) + 1 (paddingLeft) + 1 (inner paddingLeft) = 3 spaces.
      expect(frame).toContain('   Thinking summary');

      const lines = frame.split('\n');
      // body: starts with "  │ " (2 spaces + border + 1 space).
      expect(lines.some((l) => /^ {2}│ Thinking body/.test(l))).toBe(true);
      expect(frame).toMatchSnapshot();
    });

    it('aligns to column 4 in copy mode', async () => {
      const { lastFrame, waitUntilReady } = renderWithProviders(
        <ThinkingMessage thought={thought} />,
        { width: terminalWidth, uiState: { copyModeEnabled: true } },
      );
      await waitUntilReady();
      const frame = lastFrame();
      const lines = frame.split('\n');
      // summary: remains at 3 spaces.
      expect(lines.some((l) => l.startsWith('   Thinking summary'))).toBe(true);
      // body: 1 (marginLeft) + 1 (paddingLeft) + 1 (border comp) + 1 (paddingLeft) = 4 spaces.
      expect(lines.some((l) => l.startsWith('    Thinking body'))).toBe(true);
      expect(frame).toMatchSnapshot();
    });
  });

  describe('ToolGroupMessage (Standard Tool)', () => {
    const toolCalls = [
      {
        callId: 'tool-1',
        name: 'test-tool',
        status: CoreToolCallStatus.Executing,
        resultDisplay: 'tool output text',
        description: 'Running test-tool',
        confirmationDetails: undefined,
        renderOutputAsMarkdown: false,
      },
    ];

    it('renders header and content in normal mode', async () => {
      const { lastFrame, waitUntilReady } = renderWithProviders(
        <ToolGroupMessage
          item={{ type: 'tool_group', id: 1, tools: [] }}
          toolCalls={toolCalls}
          terminalWidth={terminalWidth}
          availableTerminalHeight={100}
        />,
        { width: terminalWidth, uiState: { copyModeEnabled: false } },
      );
      await waitUntilReady();
      await new Promise((resolve) => setTimeout(resolve, 200));
      const frame = lastFrame();
      expect(frame).toContain('tool output text');
    });

    it('aligns header and content to column 4 in copy mode', async () => {
      const { lastFrame, waitUntilReady } = renderWithProviders(
        <ToolGroupMessage
          item={{ type: 'tool_group', id: 1, tools: [] }}
          toolCalls={toolCalls}
          terminalWidth={terminalWidth}
          availableTerminalHeight={100}
        />,
        {
          width: terminalWidth,
          uiState: { copyModeEnabled: true },
          useAlternateBuffer: false,
        },
      );
      await waitUntilReady();
      await new Promise((resolve) => setTimeout(resolve, 200));
      const frame = lastFrame();
      const lines = frame.split('\n');

      // Header should have 3 spaces of indentation to start at column 4.
      expect(lines.some((l) => l.startsWith('   ⊷'))).toBe(true);
      // Content should also have 3 spaces.
      expect(lines.some((l) => l.startsWith('   tool output text'))).toBe(true);

      expect(frame).toMatchSnapshot();
    });
  });
});
