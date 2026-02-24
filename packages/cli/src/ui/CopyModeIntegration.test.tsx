/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { renderWithProviders } from '../test-utils/render.js';
import { UserMessage } from './components/messages/UserMessage.js';
import { GeminiMessage } from './components/messages/GeminiMessage.js';
import { GeminiMessageContent } from './components/messages/GeminiMessageContent.js';
import { ThinkingMessage } from './components/messages/ThinkingMessage.js';
import { ToolGroupMessage } from './components/messages/ToolGroupMessage.js';
import { CoreToolCallStatus } from '@google/gemini-cli-core';

describe('Copy Mode Alignment Regression', () => {
  const terminalWidth = 80;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('UserMessage', () => {
    it('aligns to column 4 in normal mode', async () => {
      let renderResult: ReturnType<typeof renderWithProviders>;
      await act(async () => {
        renderResult = renderWithProviders(
          <UserMessage text="Hello" width={terminalWidth} />,
          { width: terminalWidth, uiState: { copyModeEnabled: false } },
        );
        await renderResult.waitUntilReady();
      });
      const frame = renderResult!.lastFrame();
      // 1 (margin) + 2 (prefix "> ") = 3 chars before "Hello". Text starts at index 3.
      expect(frame).toContain('> Hello');
    });

    it('aligns to column 4 in copy mode', async () => {
      let renderResult: ReturnType<typeof renderWithProviders>;
      await act(async () => {
        renderResult = renderWithProviders(
          <UserMessage text="Hello" width={terminalWidth} />,
          { width: terminalWidth, uiState: { copyModeEnabled: true } },
        );
        await renderResult.waitUntilReady();
      });
      const frame = renderResult!.lastFrame();
      expect(frame).toContain('> Hello');
    });
  });

  describe('GeminiMessage', () => {
    it('aligns to column 4 in normal mode', async () => {
      let renderResult: ReturnType<typeof renderWithProviders>;
      await act(async () => {
        renderResult = renderWithProviders(
          <GeminiMessage
            text="Response"
            isPending={false}
            terminalWidth={terminalWidth}
          />,
          { width: terminalWidth, uiState: { copyModeEnabled: false } },
        );
        await renderResult.waitUntilReady();
      });
      const frame = renderResult!.lastFrame();
      // 1 (margin) + 2 (prefix "✦ ") = 3 chars before "Response". Text starts at index 3.
      expect(frame).toContain('✦ Response');
    });

    it('aligns to column 4 in copy mode', async () => {
      let renderResult: ReturnType<typeof renderWithProviders>;
      await act(async () => {
        renderResult = renderWithProviders(
          <GeminiMessage
            text="Response"
            isPending={false}
            terminalWidth={terminalWidth}
          />,
          { width: terminalWidth, uiState: { copyModeEnabled: true } },
        );
        await renderResult.waitUntilReady();
      });
      const frame = renderResult!.lastFrame();
      expect(frame).toContain('✦ Response');
    });
  });

  describe('GeminiMessageContent', () => {
    it('aligns to column 4 in normal mode', async () => {
      let renderResult: ReturnType<typeof renderWithProviders>;
      await act(async () => {
        renderResult = renderWithProviders(
          <GeminiMessageContent
            text="Continued content"
            isPending={false}
            terminalWidth={terminalWidth}
          />,
          { width: terminalWidth, uiState: { copyModeEnabled: false } },
        );
        await renderResult.waitUntilReady();
      });
      const frame = renderResult!.lastFrame();
      // 1 (margin) + 2 (paddingLeft) = 3 spaces before content.
      expect(frame).toContain('  Continued content');
    });

    it('aligns to column 4 in copy mode', async () => {
      let renderResult: ReturnType<typeof renderWithProviders>;
      await act(async () => {
        renderResult = renderWithProviders(
          <GeminiMessageContent
            text="Continued content"
            isPending={false}
            terminalWidth={terminalWidth}
          />,
          { width: terminalWidth, uiState: { copyModeEnabled: true } },
        );
        await renderResult.waitUntilReady();
      });
      const frame = renderResult!.lastFrame();
      expect(frame).toContain('  Continued content');
    });
  });

  describe('ThinkingMessage', () => {
    const thought = {
      subject: 'Thinking summary',
      description: 'Thinking body',
    };

    it('aligns to column 4 in normal mode', async () => {
      let renderResult: ReturnType<typeof renderWithProviders>;
      await act(async () => {
        renderResult = renderWithProviders(
          <ThinkingMessage thought={thought} terminalWidth={terminalWidth} />,
          { width: terminalWidth, uiState: { copyModeEnabled: false } },
        );
        await renderResult.waitUntilReady();
      });
      const frame = renderResult!.lastFrame();
      // summary: 1 (marginLeft) + 2 (paddingLeft) = 3 spaces.
      expect(frame).toContain(' │ Thinking summary');

      const lines = frame.split('\n');
      // body: 1 (marginLeft) + 1 (border) + 1 (paddingLeft) = 3 chars.
      // Line starts with " │ " (1 space then border).
      expect(lines.some((l) => /^ │ Thinking body/.test(l))).toBe(true);
      expect(frame).toMatchSnapshot();
    });

    it('aligns to column 4 in copy mode', async () => {
      let renderResult: ReturnType<typeof renderWithProviders>;
      await act(async () => {
        renderResult = renderWithProviders(
          <ThinkingMessage thought={thought} terminalWidth={terminalWidth} />,
          { width: terminalWidth, uiState: { copyModeEnabled: true } },
        );
        await renderResult.waitUntilReady();
      });
      const frame = renderResult!.lastFrame();
      const lines = frame.split('\n');
      // summary: remains at 3 spaces.
      expect(lines.some((l) => l.startsWith('   Thinking summary'))).toBe(true);
      // body: 1 (marginLeft) + 2 (CopySafeBox padding compensation) = 3 spaces.
      expect(lines.some((l) => l.startsWith('   Thinking body'))).toBe(true);
      expect(frame).toMatchSnapshot();
    });
  });

  describe('ToolGroupMessage (Standard Tool)', () => {
    const toolCalls = [
      {
        callId: 'tool-1',
        name: 'test-tool',
        status: CoreToolCallStatus.Success,
        resultDisplay: 'tool output text',
        description: 'Running test-tool',
        confirmationDetails: undefined,
        renderOutputAsMarkdown: false,
      },
    ];

    it('renders header and content in normal mode', async () => {
      let renderResult: ReturnType<typeof renderWithProviders>;
      await act(async () => {
        renderResult = renderWithProviders(
          <ToolGroupMessage
            item={{ type: 'tool_group', id: 1, tools: [] }}
            toolCalls={toolCalls}
            terminalWidth={terminalWidth}
            availableTerminalHeight={100}
          />,
          { width: terminalWidth, uiState: { copyModeEnabled: false } },
        );
        await renderResult.waitUntilReady();
      });
      const frame = renderResult!.lastFrame();
      expect(frame).toContain('tool output text');
    });

    it('aligns header and content to column 4 in copy mode', async () => {
      let renderResult: ReturnType<typeof renderWithProviders>;
      await act(async () => {
        renderResult = renderWithProviders(
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
        await renderResult.waitUntilReady();
      });
      const frame = renderResult!.lastFrame();
      const lines = frame.split('\n');

      // Header should be rendered
      expect(lines.some((l) => l.includes('✓  test-tool'))).toBe(true);
      // Content should be rendered
      expect(lines.some((l) => l.includes('tool output text'))).toBe(true);

      expect(frame).toMatchSnapshot();
    });
  });
});
