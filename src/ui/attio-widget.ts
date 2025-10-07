import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

export const ATTIO_WIDGET_URI = 'ui://widget/attio-generic.html';

const ATTIO_WIDGET_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Attio MCP Tool Viewer</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      body {
        margin: 0;
        padding: 0.75rem 1rem;
        background: transparent;
        color: inherit;
      }
      h1 {
        font-size: 0.95rem;
        margin: 0 0 0.5rem;
        font-weight: 600;
      }
      pre {
        margin: 0;
        padding: 0.75rem;
        border-radius: 0.5rem;
        background: rgba(128, 128, 128, 0.12);
        overflow-x: auto;
        font-size: 0.85rem;
        line-height: 1.35;
        max-height: 320px;
      }
      .empty {
        font-style: italic;
        opacity: 0.7;
      }
      .error {
        color: #b3261e;
      }
    </style>
  </head>
  <body>
    <h1>Latest Tool Output</h1>
    <pre id="attio-widget-output" class="empty">Waiting for tool response…</pre>
    <script type="module">
      const output = document.getElementById('attio-widget-output');

      const render = () => {
        try {
          const bridge = window.openai || window.oai || window.webplus;
          if (!bridge) {
            output.textContent = 'ChatGPT bridge unavailable.';
            output.classList.add('error');
            return;
          }

          const payload = bridge.toolOutput ?? {};
          const content = payload.structuredContent ?? payload;

          if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
            output.textContent = 'No structured data returned by the tool.';
            output.classList.add('empty');
            output.classList.remove('error');
            return;
          }

          output.textContent = JSON.stringify(content, null, 2);
          output.classList.remove('empty');
          output.classList.remove('error');
        } catch (error) {
          output.textContent = 'Unable to render structured content: ' + String(error);
          output.classList.add('error');
        }
      };

      window.addEventListener('openai:set_globals', render);
      render();
    </script>
  </body>
</html>`;

const DEFAULT_WIDGET_META = {
  'openai/widgetDescription':
    'Renders the structured output from Attio MCP tools, highlighting JSON payloads for quick inspection.',
  'openai/widgetPrefersBorder': true,
  'openai/widgetCSP': {
    connect_domains: [] as string[],
    resource_domains: [] as string[],
  },
} as const;

export function registerAttioWidget(server: Server): void {
  // registerResource is provided by the MCP SDK at runtime even though the
  // current type definitions do not expose it. Casting to any keeps this
  // snapshot lightweight while we evaluate the Apps SDK path.
  const anyServer = server as unknown as {
    registerResource: (
      id: string,
      uri: string,
      options: Record<string, unknown>,
      handler: () => Promise<unknown>
    ) => void;
  };

  anyServer.registerResource(
    'attio-generic-widget',
    ATTIO_WIDGET_URI,
    {},
    async () => ({
      contents: [
        {
          uri: ATTIO_WIDGET_URI,
          mimeType: 'text/html+skybridge',
          text: ATTIO_WIDGET_HTML,
          _meta: DEFAULT_WIDGET_META,
        },
      ],
    })
  );
}
