import express from 'express';

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '4000', 10);
const AHA_BASE_URL = process.env.AHA_BASE_URL;
const AHA_API_KEY = process.env.AHA_API_KEY;

if (!AHA_BASE_URL || !AHA_API_KEY) {
  console.error('ERROR: AHA_BASE_URL and AHA_API_KEY environment variables are required.');
  process.exit(1);
}

// ─── Aha.io API helpers ─────────────────────────────────────────────────────

async function ahaFetch(path, fields) {
  const url = new URL(`/api/v1${path}`, AHA_BASE_URL.replace(/\/$/, ''));
  if (fields) url.searchParams.set('fields', fields);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AHA_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (response.status === 401) throw new Error('API key is invalid or expired.');
  if (response.status === 404) throw new Error('Resource not found (or access denied — Aha.io returns 404 for both).');
  if (response.status === 429) throw new Error('Rate limited. Aha.io allows 300 req/min per account.');
  if (!response.ok) throw new Error(`Aha.io API: ${response.status} ${response.statusText}`);

  return response.json();
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function formatRecord(record, type) {
  return [
    `${type}: ${record.name || 'Untitled'}`,
    `Reference: ${record.reference_num || 'N/A'}`,
    `Status: ${record.workflow_status?.name || 'Unknown'}`,
    record.url ? `URL: ${record.url}` : '',
    '',
    'Description:',
    stripHtml(record.description?.body || record.description || '(no description)'),
  ].filter(Boolean).join('\n');
}

// ─── MCP Tool Definitions ───────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'get_aha_epic',
    description: 'Get an Aha.io epic by reference number (e.g., PROJ-E-123). Returns the epic title, description, status, and lists its child features.',
    inputSchema: {
      type: 'object',
      required: ['epicRef'],
      properties: {
        epicRef: { type: 'string', description: 'Epic reference number (e.g., PROJ-E-123)' },
      },
    },
  },
  {
    name: 'get_aha_feature',
    description: 'Get an Aha.io feature by reference number (e.g., PROJ-123). Returns the feature title, description, status, and lists its requirements.',
    inputSchema: {
      type: 'object',
      required: ['featureRef'],
      properties: {
        featureRef: { type: 'string', description: 'Feature reference number (e.g., PROJ-123)' },
      },
    },
  },
  {
    name: 'get_aha_features_for_epic',
    description: 'List all features under an Aha.io epic. Returns feature names, references, statuses, and URLs.',
    inputSchema: {
      type: 'object',
      required: ['epicRef'],
      properties: {
        epicRef: { type: 'string', description: 'Epic reference number (e.g., PROJ-E-123)' },
      },
    },
  },
  {
    name: 'get_aha_requirements',
    description: 'List all requirements under an Aha.io feature. Returns requirement names, references, statuses, and URLs.',
    inputSchema: {
      type: 'object',
      required: ['featureRef'],
      properties: {
        featureRef: { type: 'string', description: 'Feature reference number (e.g., PROJ-123)' },
      },
    },
  },
  {
    name: 'get_aha_requirement',
    description: 'Get a specific Aha.io requirement by reference number.',
    inputSchema: {
      type: 'object',
      required: ['requirementRef'],
      properties: {
        requirementRef: { type: 'string', description: 'Requirement reference number (e.g., PROJ-123-1)' },
      },
    },
  },
  {
    name: 'search_aha_features',
    description: 'Search for features in an Aha.io product by name. Returns matching features with references and statuses.',
    inputSchema: {
      type: 'object',
      required: ['productId', 'query'],
      properties: {
        productId: { type: 'string', description: 'Product ID or slug' },
        query: { type: 'string', description: 'Search term to match against feature names' },
      },
    },
  },
];

// ─── Tool Handlers ──────────────────────────────────────────────────────────

async function handleTool(name, args) {
  switch (name) {
    case 'get_aha_epic': {
      const data = await ahaFetch(`/epics/${args.epicRef}`, 'name,description,reference_num,url,workflow_status');
      const epic = data.epic || data;
      let text = formatRecord(epic, 'Epic');

      // Also fetch features summary
      try {
        const featData = await ahaFetch(`/epics/${args.epicRef}/features`, 'name,reference_num,url,workflow_status');
        const features = featData.features || [];
        if (features.length > 0) {
          text += '\n\nFeatures:\n' + features.map(f =>
            `- ${f.reference_num}: ${f.name} [${f.workflow_status?.name || 'Unknown'}]${f.url ? ` (${f.url})` : ''}`
          ).join('\n');
        }
      } catch { /* non-fatal */ }

      return text;
    }

    case 'get_aha_feature': {
      const data = await ahaFetch(`/features/${args.featureRef}`, 'name,description,reference_num,url,workflow_status');
      const feature = data.feature || data;
      let text = formatRecord(feature, 'Feature');

      // Also fetch requirements summary
      try {
        const reqData = await ahaFetch(`/features/${args.featureRef}/requirements`, 'name,reference_num,url,workflow_status');
        const reqs = reqData.requirements || [];
        if (reqs.length > 0) {
          text += '\n\nRequirements:\n' + reqs.map(r =>
            `- ${r.reference_num}: ${r.name} [${r.workflow_status?.name || 'Unknown'}]`
          ).join('\n');
        }
      } catch { /* non-fatal */ }

      return text;
    }

    case 'get_aha_features_for_epic': {
      const data = await ahaFetch(`/epics/${args.epicRef}/features`, 'name,reference_num,url,workflow_status');
      const features = data.features || [];
      if (features.length === 0) return `No features found for epic ${args.epicRef}.`;
      return features.map(f =>
        `- ${f.reference_num}: ${f.name} [${f.workflow_status?.name || 'Unknown'}]${f.url ? ` (${f.url})` : ''}`
      ).join('\n');
    }

    case 'get_aha_requirements': {
      const data = await ahaFetch(`/features/${args.featureRef}/requirements`, 'name,reference_num,url,workflow_status');
      const reqs = data.requirements || [];
      if (reqs.length === 0) return `No requirements found for feature ${args.featureRef}.`;
      return reqs.map(r =>
        `- ${r.reference_num}: ${r.name} [${r.workflow_status?.name || 'Unknown'}]`
      ).join('\n');
    }

    case 'get_aha_requirement': {
      const data = await ahaFetch(`/requirements/${args.requirementRef}`, 'name,description,reference_num,url,workflow_status');
      const req = data.requirement || data;
      return formatRecord(req, 'Requirement');
    }

    case 'search_aha_features': {
      const data = await ahaFetch(`/products/${args.productId}/features`, 'name,reference_num,url,workflow_status');
      const features = (data.features || []).filter(f =>
        f.name?.toLowerCase().includes(args.query.toLowerCase())
      );
      if (features.length === 0) return `No features matching "${args.query}" in product ${args.productId}.`;
      return features.map(f =>
        `- ${f.reference_num}: ${f.name} [${f.workflow_status?.name || 'Unknown'}]${f.url ? ` (${f.url})` : ''}`
      ).join('\n');
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── MCP JSON-RPC Endpoint ──────────────────────────────────────────────────

app.post('/mcp', async (req, res) => {
  const { jsonrpc, id, method, params } = req.body;

  if (jsonrpc !== '2.0') {
    return res.json({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid JSON-RPC version' } });
  }

  try {
    switch (method) {
      case 'initialize':
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'aha-mcp-server', version: '1.0.0' },
          },
        });

      case 'tools/list':
        return res.json({ jsonrpc: '2.0', id, result: { tools: TOOLS } });

      case 'tools/call': {
        const { name, arguments: args } = params || {};
        if (!name) {
          return res.json({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Missing tool name' } });
        }

        try {
          const text = await handleTool(name, args || {});
          return res.json({
            jsonrpc: '2.0', id,
            result: { content: [{ type: 'text', text }] },
          });
        } catch (err) {
          return res.json({
            jsonrpc: '2.0', id,
            result: { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] },
          });
        }
      }

      case 'notifications/initialized':
        return res.json({ jsonrpc: '2.0', id, result: {} });

      default:
        return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } });
    }
  } catch (err) {
    return res.json({ jsonrpc: '2.0', id, error: { code: -32603, message: err.message } });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', server: 'aha-mcp-server' }));

app.listen(PORT, () => {
  console.log(`Aha.io MCP server listening on port ${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Connected to: ${AHA_BASE_URL}`);
});
