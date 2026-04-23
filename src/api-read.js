#!/usr/bin/env node
/**
 * CLI tool: Read a Confluence page via MCP server (REST API, no browser needed).
 * Usage: node src/api-read.js <contentId>
 *        node src/api-read.js "https://confluence.mastercard.int/display/SPACE/Page+Title"
 * Output: JSON { title, textContent, id, space, url } to stdout
 *
 * Requires: Confluence MCP server running at localhost:3998 (Docker)
 *
 * Note: If a URL is provided, we first search for the page by title to resolve
 * the content ID, then fetch the full content. If a numeric ID is provided, we
 * fetch directly.
 */

const MCP_URL = process.env.CONFLUENCE_MCP_URL || 'http://localhost:3998/mcp';

const input = process.argv[2];

if (!input) {
  console.error('Usage:');
  console.error('  npm run api-read <contentId>');
  console.error('  npm run api-read "https://confluence.mastercard.int/display/SPACE/Page+Title"');
  process.exit(1);
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

function extractTitleFromUrl(url) {
  // Handle /display/SPACE/Page+Title format
  const displayMatch = url.match(/\/display\/([^/]+)\/(.+?)(?:\?|#|$)/);
  if (displayMatch) {
    return {
      spaceKey: displayMatch[1],
      title: decodeURIComponent(displayMatch[2].replace(/\+/g, ' '))
    };
  }
  // Handle /pages/viewpage.action?pageId=12345
  const pageIdMatch = url.match(/pageId=(\d+)/);
  if (pageIdMatch) {
    return { contentId: pageIdMatch[1] };
  }
  return null;
}

function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

try {
  let contentId;

  // Determine if input is a content ID or URL
  if (/^\d+$/.test(input)) {
    contentId = input;
  } else if (input.startsWith('http')) {
    const parsed = extractTitleFromUrl(input);
    if (!parsed) {
      console.error('Error: Could not parse Confluence URL. Provide a content ID instead.');
      process.exit(1);
    }

    if (parsed.contentId) {
      contentId = parsed.contentId;
    } else {
      // Search by title to resolve the content ID
      // Use first 3 significant words for fuzzy match (skip stop words)
      // Note: space filter with title~ can be unreliable in some CQL implementations,
      // so we search by title only and verify space in results
      const stopWords = new Set(['the','a','an','and','or','for','in','on','of','to','by','with','from']);
      const significantWords = parsed.title.split(/\s+/).filter(w => !stopWords.has(w.toLowerCase()));
      const shortTitle = significantWords.slice(0, 3).join(' ');
      const cql = `type=page and title~"${shortTitle}"`;

      const searchRaw = await callMcp('search_confluence_content', { cql, limit: 5 });

      let searchResults;
      try {
        searchResults = JSON.parse(searchRaw);
      } catch {
        // Try to extract content ID from text response
        const idMatch = searchRaw.match(/ID:\s*(\d+)/);
        if (idMatch) {
          contentId = idMatch[1];
        } else {
          console.error('Error: Could not find page. Try using the content ID directly.');
          console.error('Search response:', searchRaw);
          process.exit(1);
        }
      }

      if (!contentId) {
        // Parse text response: "- Title (ID: 12345) - Type: page, ... Space: KEY"
        const searchText = typeof searchResults === 'string' ? searchResults : '';
        const searchLines = (searchRaw || searchText).split('\n').filter(l => l.startsWith('- '));

        if (searchLines.length === 0) {
          console.error(`Error: No page found matching "${parsed.title}" in space "${parsed.spaceKey || 'any'}"`);
          process.exit(1);
        }

        // Parse all results and prefer one from the correct space
        const candidates = searchLines.map(line => {
          const tm = line.match(/\(ID: (\d+)\)/);
          const sm = line.match(/Space: (\S+)/);
          return { id: tm?.[1], space: sm?.[1], line };
        }).filter(c => c.id);

        const match = (parsed.spaceKey && candidates.find(c => c.space === parsed.spaceKey))
          || candidates[0];

        if (!match) {
          console.error(`Error: No page found matching "${parsed.title}"`);
          process.exit(1);
        }
        contentId = match.id;
      }
    }
  } else {
    console.error('Error: Provide a numeric content ID or a Confluence URL.');
    process.exit(1);
  }

  // Fetch the full page content
  const raw = await callMcp('get_confluence_content', { contentId });

  // MCP returns text like:
  //   Content: Title Here
  //   ID: 12345
  //   Space: Team Name (KEY)
  //   Content Preview:
  //   <html content...>
  //   Web URL: /spaces/KEY/pages/12345/Title

  const titleMatch = raw.match(/^Content: (.+)$/m);
  const idMatch = raw.match(/^ID: (\d+)$/m);
  const spaceMatch = raw.match(/^Space: .+?\((\w+)\)$/m) || raw.match(/^Space: (\S+)$/m);
  const urlMatch = raw.match(/^Web URL: (.+)$/m);

  // Extract HTML content between "Content Preview:" and "Web URL:"
  const previewStart = raw.indexOf('Content Preview:\n');
  const webUrlStart = raw.lastIndexOf('\nWeb URL:');
  let htmlContent = '';
  if (previewStart !== -1) {
    const start = previewStart + 'Content Preview:\n'.length;
    const end = webUrlStart !== -1 ? webUrlStart : raw.length;
    htmlContent = raw.substring(start, end).trim();
  }

  const textContent = stripHtml(htmlContent);

  // Extract links from HTML
  const linkRegex = /href="([^"]*?)"/g;
  const links = [];
  let match;
  while ((match = linkRegex.exec(htmlContent)) !== null) {
    const href = match[1];
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push(href);
    }
  }

  const baseUrl = process.env.CONFLUENCE_BASE_URL || 'https://confluence.mastercard.int';

  console.log(JSON.stringify({
    title: titleMatch?.[1] || 'Untitled',
    textContent,
    id: idMatch?.[1] || contentId,
    space: spaceMatch?.[1] || '',
    url: urlMatch?.[1] ? baseUrl + urlMatch[1] : '',
    links
  }, null, 2));
} catch (err) {
  if (err.cause?.code === 'ECONNREFUSED') {
    console.error('Error: Confluence MCP server not reachable at ' + MCP_URL);
    console.error('Is Docker running? Try: docker start confluence-mcp');
  } else {
    console.error('Error:', err.message);
  }
  process.exit(1);
}
