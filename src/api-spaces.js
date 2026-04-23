#!/usr/bin/env node
/**
 * CLI tool: List Confluence spaces or browse space content via MCP server.
 * Usage: node src/api-spaces.js                    # list all spaces
 *        node src/api-spaces.js ISA                # list pages in space ISA
 *        node src/api-spaces.js --children 12345   # list child pages of page 12345
 * Output: JSON to stdout
 *
 * Requires: Confluence MCP server running at localhost:3998 (Docker)
 */

const MCP_URL = process.env.CONFLUENCE_MCP_URL || 'http://localhost:3998/mcp';

const args = process.argv.slice(2);

async function callMcp(toolName, toolArgs) {
  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: toolArgs }
    })
  });

  if (!response.ok) {
    throw new Error(`MCP server returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
  }

  if (data.result?.isError) {
    const text = data.result.content?.[0]?.text || 'Unknown error';
    throw new Error(`Tool error: ${text}`);
  }

  return data.result?.content?.[0]?.text || '';
}

try {
  let result;

  if (args[0] === '--children' && args[1]) {
    result = await callMcp('get_confluence_child_pages', { parentId: args[1] });
  } else if (args[0] && args[0] !== '--help') {
    result = await callMcp('get_confluence_space_content', { spaceKey: args[0], limit: 50 });
  } else if (args[0] === '--help') {
    console.error('Usage:');
    console.error('  npm run api-spaces                    # list all spaces');
    console.error('  npm run api-spaces ISA                # list pages in space ISA');
    console.error('  npm run api-spaces -- --children 123  # child pages of page 123');
    process.exit(0);
  } else {
    result = await callMcp('get_confluence_spaces', { limit: 50 });
  }

  // Try to pretty-print if JSON
  try {
    console.log(JSON.stringify(JSON.parse(result), null, 2));
  } catch {
    console.log(result);
  }
} catch (err) {
  if (err.cause?.code === 'ECONNREFUSED') {
    console.error('Error: Confluence MCP server not reachable at ' + MCP_URL);
    console.error('Is Docker running? Try: docker start confluence-mcp');
  } else {
    console.error('Error:', err.message);
  }
  process.exit(1);
}
