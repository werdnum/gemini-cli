/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../tools/tool-registry.js';
import { isValidToolName } from '../tools/tool-names.js';
import { DiscoveredMCPTool } from '../tools/mcp-tool.js';
import type { Config } from '../config/config.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import type { CallableTool } from '@google/genai';
import type { LocalAgentDefinition } from './types.js';

// Mock Config and MessageBus
const mockConfig = {
  getExcludeTools: () => new Set(),
  getToolDiscoveryCommand: () => undefined,
  getToolCallCommand: () => undefined,
} as unknown as Config;

const mockMessageBus = {} as MessageBus;

describe('MCP Tool Loading for Subagents', () => {
  it('should validate simple tool names and find them in registry', async () => {
    const registry = new ToolRegistry(mockConfig, mockMessageBus);

    // 1. Register an MCP tool. It should be registered with its simple name
    // because there are no collisions.
    const mcpTool = new DiscoveredMCPTool(
      {} as unknown as CallableTool, // mock CallableTool
      'my-server',
      'my_tool',
      'My Description',
      {},
      mockMessageBus,
      true,
    );

    registry.registerTool(mcpTool);

    // Verify it's registered as 'my_tool'
    expect(registry.getTool('my_tool')).toBeDefined();

    // 2. Verify isValidToolName behavior
    // This is the key change: isValidToolName should now accept simple names
    expect(isValidToolName('my_tool')).toBe(true);

    // 3. Simulate LocalAgentExecutor.create behavior
    const agentDefinition: LocalAgentDefinition = {
      kind: 'local',
      name: 'subagent',
      description: 'A subagent',
      promptConfig: { systemPrompt: '', query: '' },
      modelConfig: { model: 'test' },
      runConfig: { maxTurns: 1, maxTimeMinutes: 1 },
      toolConfig: {
        tools: ['my_tool'], // Using simple name
      },
      inputConfig: { inputs: {} },
    };

    const runtimeContext = {
      getToolRegistry: () => registry,
      getMessageBus: () => mockMessageBus,
      getExcludeTools: () => new Set(),
    } as unknown as Config;

    // Logic from LocalAgentExecutor.create:
    const agentToolRegistry = new ToolRegistry(runtimeContext, mockMessageBus);
    const parentToolRegistry = runtimeContext.getToolRegistry();

    let toolFound = false;
    for (const toolRef of agentDefinition.toolConfig!.tools) {
      if (typeof toolRef === 'string') {
        const toolFromParent = parentToolRegistry.getTool(toolRef);
        if (toolFromParent) {
          agentToolRegistry.registerTool(toolFromParent);
          toolFound = true;
        }
      }
    }

    // With the fix (both isValidToolName change and existing registry behavior),
    // this should be true.
    expect(toolFound).toBe(true);
    expect(agentToolRegistry.getTool('my_tool')).toBeDefined();
  });
});
