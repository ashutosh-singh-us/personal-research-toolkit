/**
 * Aha.io REST API client — reads epics, features, and requirements.
 * Uses the Aha.io REST API for direct access without browser automation.
 *
 * Auth: API key (Bearer token) from AHA_API_KEY env var.
 * Docs: https://www.aha.io/api
 */

function getConfig() {
  const AHA_BASE_URL = process.env.AHA_BASE_URL;
  const AHA_API_KEY = process.env.AHA_API_KEY;
  if (!AHA_BASE_URL) {
    throw new Error('AHA_BASE_URL not set in .env (e.g., https://your-company.aha.io)');
  }
  if (!AHA_API_KEY) {
    throw new Error('AHA_API_KEY not set. Add it to ~/mcp-servers/aha_mcp.env (generate at: Aha.io > Settings > Personal > Developer)');
  }
  return { baseUrl: AHA_BASE_URL.replace(/\/$/, ''), apiKey: AHA_API_KEY };
}

async function ahaFetch(path, fields) {
  const { baseUrl, apiKey } = getConfig();
  const url = new URL(`/api/v1${path}`, baseUrl);
  if (fields) url.searchParams.set('fields', fields);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (response.status === 401) {
    throw new Error('AHA_API_KEY is invalid or expired. Regenerate at: Aha.io > Settings > Personal > Developer');
  }
  if (response.status === 404) {
    throw new Error(`Not found (404). Check the URL/ID — Aha.io returns 404 for both missing and access-denied resources.`);
  }
  if (!response.ok) {
    throw new Error(`Aha.io API returned ${response.status}: ${response.statusText}`);
  }

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

/**
 * Parse an Aha.io URL to extract the resource type and reference.
 * Supports:
 *   /epics/PROJ-E-123
 *   /features/PROJ-123
 *   /requirements/PROJ-123-1
 *   /releases/PROJ-R-1
 */
function parseAhaUrl(url) {
  const parsed = new URL(url);
  const pathParts = parsed.pathname.split('/').filter(Boolean);

  // Find the resource type and reference
  const types = ['epics', 'features', 'requirements', 'releases', 'initiatives'];
  for (let i = 0; i < pathParts.length; i++) {
    if (types.includes(pathParts[i]) && pathParts[i + 1]) {
      return { type: pathParts[i], ref: pathParts[i + 1] };
    }
  }

  throw new Error(`Could not parse Aha.io URL: ${url}. Expected format: https://company.aha.io/epics/PROJ-E-123`);
}

/**
 * Read an epic by reference (e.g., "PROJ-E-123").
 * Returns: { title, textContent, features[], links[] }
 */
async function readEpic(ref) {
  const epic = await ahaFetch(`/epics/${ref}`, 'name,description,reference_num,url,workflow_status');
  const e = epic.epic || epic;

  // Fetch features under this epic
  let features = [];
  try {
    const featuresData = await ahaFetch(`/epics/${ref}/features`, 'name,reference_num,url,workflow_status');
    const featureList = featuresData.features || featuresData || [];
    features = featureList.map(f => ({
      title: `${f.reference_num}: ${f.name}`,
      url: f.url || '',
      status: f.workflow_status?.name || '',
    }));
  } catch {
    // Non-fatal — epic may have no features
  }

  return {
    title: e.name || '',
    reference: e.reference_num || ref,
    textContent: stripHtml(e.description?.body || e.description || ''),
    status: e.workflow_status?.name || '',
    features,
    links: [{ title: 'Epic in Aha.io', url: e.url || '' }, ...features.filter(f => f.url)],
  };
}

/**
 * Read a feature by reference (e.g., "PROJ-123").
 * Returns: { title, textContent, features[] (requirements), links[] }
 */
async function readFeature(ref) {
  const feature = await ahaFetch(`/features/${ref}`, 'name,description,reference_num,url,workflow_status');
  const f = feature.feature || feature;

  // Fetch requirements under this feature
  let requirements = [];
  try {
    const reqData = await ahaFetch(`/features/${ref}/requirements`, 'name,reference_num,url,workflow_status');
    const reqList = reqData.requirements || reqData || [];
    requirements = reqList.map(r => ({
      title: `${r.reference_num}: ${r.name}`,
      url: r.url || '',
      status: r.workflow_status?.name || '',
    }));
  } catch {
    // Non-fatal
  }

  return {
    title: f.name || '',
    reference: f.reference_num || ref,
    textContent: stripHtml(f.description?.body || f.description || ''),
    status: f.workflow_status?.name || '',
    features: requirements,
    links: [{ title: 'Feature in Aha.io', url: f.url || '' }, ...requirements.filter(r => r.url)],
  };
}

/**
 * Read a requirement by reference.
 */
async function readRequirement(ref) {
  const req = await ahaFetch(`/requirements/${ref}`, 'name,description,reference_num,url,workflow_status');
  const r = req.requirement || req;

  return {
    title: r.name || '',
    reference: r.reference_num || ref,
    textContent: stripHtml(r.description?.body || r.description || ''),
    status: r.workflow_status?.name || '',
    features: [],
    links: [{ title: 'Requirement in Aha.io', url: r.url || '' }],
  };
}

/**
 * Read any Aha.io page by URL. Auto-detects type (epic/feature/requirement).
 * Returns: { title, textContent, features[], links[] }
 */
export async function readAhaPage(url) {
  const { type, ref } = parseAhaUrl(url);

  switch (type) {
    case 'epics':
      return readEpic(ref);
    case 'features':
      return readFeature(ref);
    case 'requirements':
      return readRequirement(ref);
    default:
      // For releases/initiatives, fetch generic and return what we can
      const data = await ahaFetch(`/${type}/${ref}`);
      const record = data[type.replace(/s$/, '')] || data;
      return {
        title: record.name || '',
        reference: record.reference_num || ref,
        textContent: stripHtml(record.description?.body || record.description || ''),
        status: record.workflow_status?.name || '',
        features: [],
        links: [{ title: `${type} in Aha.io`, url: record.url || '' }],
      };
  }
}
