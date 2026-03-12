/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Box, Text } from 'ink';
import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../../../test-utils/render.js';
import { CopySafeBox } from './CopySafeBox.js';

describe('CopySafeBox', () => {
  it('renders with borders in normal mode', async () => {
    const { lastFrame, waitUntilReady } = renderWithProviders(
      <CopySafeBox borderStyle="round" borderColor="white" paddingX={1}>
        <Text>Content</Text>
      </CopySafeBox>,
      { uiState: { copyModeEnabled: false } },
    );
    await waitUntilReady();
    const frame = lastFrame();
    expect(frame).toContain('╭');
    expect(frame).toContain('Content');
    expect(frame).toMatchSnapshot();
  });

  it('removes borders and adds compensatory padding in copy mode', async () => {
    const { lastFrame, waitUntilReady } = renderWithProviders(
      <CopySafeBox borderStyle="round" borderColor="white" paddingX={1}>
        <Text>Content</Text>
      </CopySafeBox>,
      { uiState: { copyModeEnabled: true } },
    );
    await waitUntilReady();
    const frame = lastFrame();
    // Border should be gone
    expect(frame).not.toContain('╭');
    expect(frame).not.toContain('─');
    // Content should be present
    expect(frame).toContain('Content');
    // paddingX={1} + 1 for left border + 1 for right border
    // Total indentation should be 2.
    expect(frame).toContain('  Content');
    expect(frame).toMatchSnapshot();
  });

  it('handles partial borders correctly in copy mode', async () => {
    const { lastFrame, waitUntilReady } = renderWithProviders(
      <CopySafeBox borderLeft borderStyle="round" paddingLeft={1}>
        <Text>Content</Text>
      </CopySafeBox>,
      { uiState: { copyModeEnabled: true } },
    );
    await waitUntilReady();
    const frame = lastFrame();
    // 1 for borderLeft + 1 for paddingLeft = 2 total
    expect(frame).toContain('  Content');
    expect(frame).toMatchSnapshot();
  });

  it('preserves top/bottom padding in copy mode', async () => {
    const { lastFrame, waitUntilReady } = renderWithProviders(
      <Box flexDirection="column">
        <CopySafeBox borderTop borderStyle="round" paddingTop={1}>
          <Text>Content</Text>
        </CopySafeBox>
      </Box>,
      { uiState: { copyModeEnabled: true } },
    );
    await waitUntilReady();
    const frame = lastFrame();
    // 1 for borderTop + 1 for paddingTop = 2 empty lines before content
    const lines = frame.split('\n');
    expect(lines[0]).toBe('');
    expect(lines[1]).toBe('');
    expect(lines[2]).toContain('Content');
    expect(frame).toMatchSnapshot();
  });

  it('content is not indented differently when border is removed in copy mode', async () => {
    // Normal Mode
    const normalMode = renderWithProviders(
      <CopySafeBox borderStyle="round" paddingX={2}>
        <Text>Content</Text>
      </CopySafeBox>,
      { uiState: { copyModeEnabled: false } },
    );
    await normalMode.waitUntilReady();
    const normalFrame = normalMode.lastFrame();

    // Copy Mode
    const copyMode = renderWithProviders(
      <CopySafeBox borderStyle="round" paddingX={2}>
        <Text>Content</Text>
      </CopySafeBox>,
      { uiState: { copyModeEnabled: true } },
    );
    await copyMode.waitUntilReady();
    const copyFrame = copyMode.lastFrame();

    // Verify indentation via snapshot
    // In normal mode: 1 (border) + 2 (paddingX) = 3 spaces before Content
    // In copy mode: 1 (compensated border) + 2 (paddingX) = 3 spaces before Content
    expect(normalFrame).toContain('│  Content');
    expect(copyFrame).toContain('   Content');

    // The requested snapshot-based tests to verify content is unchanged
    expect(normalFrame).toMatchSnapshot();
    expect(copyFrame).toMatchSnapshot();
  });

  it('box size is unchanged in copy mode', async () => {
    let normalSize: any;
    let copySize: any;

    const normalMode = renderWithProviders(
      <CopySafeBox
        borderStyle="round"
        paddingX={2}
        paddingY={1}
        width={80}
        ref={(el) => {
          if (el && !normalSize) {
            import('ink').then(({ measureElement }) => {
              normalSize = measureElement(el);
            });
          }
        }}
      >
        <Text>Content</Text>
      </CopySafeBox>,
      { uiState: { copyModeEnabled: false } },
    );
    await normalMode.waitUntilReady();

    const copyMode = renderWithProviders(
      <CopySafeBox
        borderStyle="round"
        paddingX={2}
        paddingY={1}
        width={80}
        ref={(el) => {
          if (el && !copySize) {
            import('ink').then(({ measureElement }) => {
              copySize = measureElement(el);
            });
          }
        }}
      >
        <Text>Content</Text>
      </CopySafeBox>,
      { uiState: { copyModeEnabled: true } },
    );
    await copyMode.waitUntilReady();

    // Provide a small delay to let `measureElement` run.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(normalSize).toBeDefined();
    expect(copySize).toBeDefined();
    expect(copySize.width).toBe(normalSize.width);
    expect(copySize.height).toBe(normalSize.height);
  });
});
