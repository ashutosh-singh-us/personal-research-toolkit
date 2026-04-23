#!/usr/bin/env node
/**
 * CLI tool: Search Confluence via MCP server (REST API, no browser needed).
 * Usage: node src/api-search.js "keyword1 keyword2"
 *        node src/api-search.js --cql 'type=page and space="ISA" and title~"payments"'
 * Output: JSON array of { title, url, id, space } to stdout
 *
 * Requires: Confluence MCP server running at localhost:3998 (Docker)
 */

const MCP_URL = process.env.CONFLUENCE_MCP_URL || 'http://localhost:3998/mcp';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage:');
  console.error('  npm run api-search "your keywords"');
  console.error('  npm run api-search --cql \'type=page and title~"meeting"\'');
  process.exit(1);
}

// Parse arguments: --cql flag means raw CQL, otherwise build a keyword search
let cql;
if (args[0] === '--cql') {
  cql = args.slice(1).join(' ');
} else {
  const keywords = args.join(' ');
  cql = `type=page and text~"${keywords}"`;
}

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
  const raw = await callMcp('search_confluence_content', { cql, limit: 25 });

  // MCP returns human-readable text like:
  // "- Title Here (ID: 12345) - Type: page, Status: current, Version: 4, Space: ISA"
  // Parse into structured JSON matching the { title, url, id, space } contract
  const lines = raw.split('\n').filter(l => l.startsWith('- '));
  const baseUrl = process.env.CONFLUENCE_BASE_URL || 'https://confluence.mastercard.int';

  const results = lines.map(line => {
    const titleMatch = line.match(/^- (.+?) \(ID: (\d+)\)/);
    const spaceMatch = line.match(/Space: (\S+)/);
    const title = titleMatch?.[1] || line;
    const id = titleMatch?.[2] || '';
    const space = spaceMatch?.[1] || '';

    return {
      title,
      id,
      space,
      url: id ? `${baseUrl}/pages/viewpage.action?pageId=${id}` : ''
    };
  });

  console.log(JSON.stringify(results, null, 2));
} catch (err) {
  if (err.cause?.code === 'ECONNREFUSED') {
    console.error('Error: Confluence MCP server not reachable at ' + MCP_URL);
    console.error('Is Docker running? Try: docker start confluence-mcp');
  } else {
    console.error('Error:', err.message);
  }
  process.exit(1);
}
