import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export interface ElicitOption {
  readonly value: string;
  readonly title: string;
}

/**
 * Elicit a single selection from the user via radio buttons.
 * Falls back gracefully if the client doesn't support elicitation.
 */
export async function elicitSingleSelect(
  mcpServer: McpServer,
  message: string,
  fieldName: string,
  options: readonly ElicitOption[],
): Promise<string | null> {
  try {
    const result = await mcpServer.server.elicitInput({
      mode: 'form',
      message,
      requestedSchema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'string',
            title: fieldName,
            oneOf: options.map(o => ({ const: o.value, title: o.title })),
          },
        },
        required: [fieldName],
      },
    });

    if (result.action === 'accept' && result.content) {
      return result.content[fieldName] as string;
    }
    return null;
  } catch (err) {
    // Client doesn't support elicitation — return null to fall back to text
    console.error('[connectry-architect] elicitation failed:', err instanceof Error ? err.message : String(err));
    return null;
  }
}
