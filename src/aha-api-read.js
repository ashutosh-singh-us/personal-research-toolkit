#!/usr/bin/env node
/**
 * CLI tool: Read an Aha.io page (epic, feature, requirement) via REST API.
 *
 * Usage: node src/aha-api-read.js "https://mastercard.aha.io/epics/PROJ-E-123"
 * Output: JSON { title, textContent, features[], links[] } to stdout
 *
 * Credentials: Loads AHA_BASE_URL from .env (project), AHA_API_KEY from ~/mcp-servers/aha_mcp.env
 */
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { readAhaPage } from './aha-api.js';

// Load project .env first (base URLs), then ~/mcp-servers/aha_mcp.env (API key)
dotenv.config();
dotenv.config({ path: path.join(os.homedir(), 'mcp-servers', 'aha_mcp.env') });

const url = process.argv[2];

if (!url) {
  console.error('Usage: npm run aha-read "https://mastercard.aha.io/epics/PROJ-E-123"');
  process.exit(1);
}

try {
  const data = await readAhaPage(url);
  console.log(JSON.stringify(data, null, 2));
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
