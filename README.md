# Enterprise Research Toolkit

An AI-agent-powered research toolkit that gives **GitHub Copilot CLI** (and any MCP-compatible AI assistant) the ability to **search, read, and synthesize information** from enterprise systems — Confluence, Jira, and Aha.io — all via MCP servers and REST APIs. No browser automation required.

The AI agent is the brain. The toolkit provides the hands.

---

## What It Does

| Agent | Command | What It Produces |
|-------|---------|-----------------|
| **Confluence Research** | `@workspace /research-orchestrator-agent` | Comprehensive research report from Confluence docs |
| **AHA Impact Analysis** | `@workspace /aha-research-agent` | Impact report mapping epic features to services, teams, and code |
| **Jira Research** | `@workspace /jira-research-agent` | Task breakdown patterns, dependencies, and timeline analysis |
| **Lead Developer** | `@workspace /lead_developer` | Codebase discovery, tech stack analysis, security review |

All reports are generated as **both markdown and PDF** in the `output/` directory.

---

## Prerequisites

Before starting, ensure you have:

- **GitHub Copilot license** enabled for your EID
- **Docker Desktop** installed (via Enterprise App Store) with `Docker-Desktop-User` entitlement in AccessMC
- **VS Code >= 1.99** with GitHub Copilot + GitHub Copilot Chat extensions
- **Python 3** with **PyMuPDF** installed (`pip3 install PyMuPDF`) — used for PDF report generation
- **Node.js** (for CLI fallback tools and the Aha MCP server)
- Active accounts on:
  - Confluence: https://confluence.mastercard.int
  - Jira: https://mastercardtst.atlassian.net
  - Aha.io: https://mastercard.aha.io (requires API key)

---

## Setup Guide

### Step 1: Clone the Repository

```bash
git clone <repo-url> ~/Projects/personal-research-toolkit
cd ~/Projects/personal-research-toolkit
```

### Step 2: Generate Access Tokens

You need **3 tokens** — one for each MCP server.

#### Confluence Personal Access Token (PAT)

1. Go to https://confluence.mastercard.int
2. Navigate to: **Profile > Settings > Personal Access Tokens**
   - Direct link: https://confluence.mastercard.int/plugins/personalaccesstokens/usertokens.action
3. Click **Create token**, name it (e.g., `copilot-mcp-confluence`), set expiration
4. **Copy the token immediately** — it won't be shown again

#### Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**, name it (e.g., `copilot-mcp-jira`)
3. **Copy the token immediately**
4. Note your Atlassian email (e.g., `eXXXXXX@mastercard.com`)

#### Aha.io API Key

1. Log into https://mastercard.aha.io
2. Go to: **Settings > Account > API keys** (or navigate to Personal > API keys under your profile)
3. Generate a new key
4. **Copy the key immediately**

### Step 3: Create Environment Files

```bash
mkdir -p ~/mcp-servers
```

**`~/mcp-servers/confluence_mcp.env`:**
```env
CONFLUENCE_URL=https://confluence.mastercard.int
CONFLUENCE_PERSONAL_TOKEN=<your-confluence-pat>
```

> **IMPORTANT:** The variable names must be exactly `CONFLUENCE_URL` and `CONFLUENCE_PERSONAL_TOKEN`. Using `CONFLUENCE_SERVER` or `CONFLUENCE_TOKEN` will cause the server to start but silently fail to register Confluence tools.

**`~/mcp-servers/jira_mcp.env`:**
```env
JIRA_URL=https://mastercardtst.atlassian.net
JIRA_USERNAME=<your-atlassian-email>
JIRA_API_TOKEN=<your-jira-api-token>
```

**`~/mcp-servers/aha_mcp.env`:**
```env
AHA_BASE_URL=https://mastercard.aha.io
AHA_API_KEY=<your-aha-api-key>
PORT=4000
```

Secure the files:
```bash
chmod 600 ~/mcp-servers/*.env
```

> **Never commit these files to source control.**

### Step 4: Configure Toolkit Environment

```bash
cp .env.example .env
# Edit .env — set your Confluence and Aha.io base URLs
```

### Step 5: Log Into Firewall & Pull Docker Images

> **CRITICAL:** You MUST log into the Mastercard firewall **before** pulling Docker images, otherwise the pull will fail with auth/network errors.
>
> Firewall portal: https://stl-nz-auth.mastercard.int/connect/PortalMain
> (Alternative: https://10.154.18.132/connect/PortalMain)

```bash
# Confluence + Jira (single image serves both)
docker pull artifacts.mastercard.int:443/ghcr.io/sooperset/mcp-atlassian:latest
```

### Step 6: Start MCP Servers

#### Confluence MCP (port 3998)

```bash
docker run -d --name confluence-mcp --restart unless-stopped \
  -p 3998:3998 \
  --env-file ~/mcp-servers/confluence_mcp.env \
  artifacts.mastercard.int:443/ghcr.io/sooperset/mcp-atlassian:latest \
  --transport sse --port 3998
```

#### Jira MCP (port 3999)

```bash
docker run -d --name jira-mcp --restart unless-stopped \
  -p 3999:3999 \
  --env-file ~/mcp-servers/jira_mcp.env \
  artifacts.mastercard.int:443/ghcr.io/sooperset/mcp-atlassian:latest \
  --transport sse --port 3999
```

#### Aha.io MCP (port 4000)

The Aha MCP server is a custom Node.js server included in this toolkit:

```bash
cd aha-mcp-server
docker build -t aha-mcp-server:latest .
docker run -d --name aha-mcp --restart unless-stopped \
  -p 4000:4000 \
  --env-file ~/mcp-servers/aha_mcp.env \
  aha-mcp-server:latest
cd ..
```

### Step 7: Verify MCP Servers

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"
```

Expected output:
```
NAMES              PORTS                    STATUS
confluence-mcp     0.0.0.0:3998->3998/tcp   Up
jira-mcp           0.0.0.0:3999->3999/tcp   Up
aha-mcp            0.0.0.0:4000->4000/tcp   Up
```

Check logs for errors:
```bash
docker logs confluence-mcp
docker logs jira-mcp
docker logs aha-mcp
```

### Step 8: Configure VS Code MCP

Create/edit the **global** MCP config file so MCP is available across all VS Code workspaces:

**macOS:** `~/Library/Application Support/Code/User/mcp.json`
**Windows:** `C:\Users\<eid>\AppData\Roaming\Code\User\mcp.json`

```json
{
  "servers": {
    "confluence": {
      "url": "http://localhost:3998/sse",
      "type": "sse"
    },
    "jira": {
      "url": "http://localhost:3999/sse",
      "type": "sse"
    },
    "aha": {
      "url": "http://localhost:4000/mcp",
      "type": "http"
    }
  }
}
```

> **Transport types matter:**
> - Confluence & Jira use **SSE** transport — endpoint is `/sse`, type is `"sse"`
> - Aha uses **HTTP** transport — endpoint is `/mcp`, type is `"http"`
>
> Using the wrong transport/endpoint combination will result in 404 errors or missing tools.

Alternatively, place `.vscode/mcp.json` in a specific project for workspace-scoped config.

### Step 9: Reload VS Code & Validate

1. `Cmd+Shift+P` > **"Developer: Reload Window"**
2. Open **Copilot Chat** > switch to **Agent** mode
3. Click **"Configure Tools"** > verify Confluence, Jira, and Aha tools are listed
4. **Enable only read tools** (safety best practice — disable any create/update/delete tools)
5. Click the **`+`** button in chat to add MCP context

### Step 10: Test

Try these prompts in Copilot Chat (Agent mode):

```
Search Confluence for Smart Subscription architecture
```
```
Get the Jira issues in project ETHOCA assigned to me
```
```
Get the Aha epic PROJ-E-123
```

---

## Using the Agents (GitHub Copilot CLI)

Open the `personal-research-toolkit` folder in VS Code. All agents are registered as prompt files in `.github/prompts/` and invoked via `@workspace` in Copilot Chat (Agent mode).

### Confluence Research

Researches a topic across Confluence and produces a report with citations.

```
@workspace /research-orchestrator-agent How does the Smart Subscription architecture work?
```

With project codebase context:
```
@workspace /research-orchestrator-agent Research enhanced identification using workspace at ~/Projects/minna-identification
```

### AHA Epic Impact Analysis

Reads a planned Aha epic, researches related docs, analyzes codebases, and maps impact.

```
@workspace /aha-research-agent https://mastercard.aha.io/epics/PROJ-E-123
```

With codebase analysis:
```
@workspace /aha-research-agent https://mastercard.aha.io/epics/PROJ-E-123 with workspaces at ~/Projects/minna-identification and ~/Projects/aggregator-service
```

### Jira Research

Searches Jira history to extract task patterns, dependencies, and timelines for planning.

```
@workspace /jira-research-agent What were the task breakdowns for recent A2A payments epics?
```

### Lead Developer

Codebase discovery, tech stack analysis, code review, and security analysis.

```
@workspace /lead_developer Analyze the minna-identification service at ~/Projects/minna-identification
```

---

## How Agents Work Together

```
@workspace /aha-research-agent [epic-url] [workspace paths]
  |
  +-- Phase 1: Read AHA epic (via Aha MCP) -> extract features, themes
  +-- Phase 2: Identify research topics from epic
  +-- Phase 3: /lead_developer agents -> analyze codebases (if workspaces given)
  +-- Phase 4: Spawn /research-orchestrator-agent sub-agents -> Confluence research per topic
  |              |
  |              +-- Search Confluence (via MCP)
  |              +-- Spawn research-sub-agents to read pages in parallel
  |              +-- Persist findings to temp file (prevents context rot)
  |              +-- Synthesize topic report
  +-- Phase 5: /jira-research-agent -> historical task patterns (if relevant)
  +-- Phase 6: Impact analysis -> map features to services, teams, code
  +-- Phase 7: Synthesize final report (markdown + PDF)
```

The AHA agent is an **orchestrator of orchestrators** — it delegates documentation research to confluence research sub-agents, codebase analysis to lead developer agents, and Jira history to the Jira research agent.

Each agent can also be used **standalone** for focused tasks.

---

## Output Files

All reports are written to the `output/` directory as both markdown and PDF:

| File Pattern | Agent | Purpose |
|---|---|---|
| `<topic>-research-report.md/.pdf` | Confluence Research | Knowledge research report |
| `<epic>-impact-report.md/.pdf` | AHA Research | Epic impact analysis |
| `<slug>-jira-research.md/.pdf` | Jira Research | Task patterns and dependency analysis |
| `<topic>-temp-research.md` | Internal | Working file during research (auto-deleted) |

Temp files prevent **context rot** — agents persist findings to a shared file so nothing is lost as context windows fill up. They are deleted after the final report is synthesized.

### Manual PDF Generation

To convert any markdown file to PDF manually:

```bash
python3 src/md-to-pdf.py output/my-report.md
# Produces output/my-report.pdf
```

Requires PyMuPDF: `pip3 install PyMuPDF`

---

## MCP Tools Reference

### Confluence (port 3998)

| Tool | Description |
|------|-------------|
| `confluence_search` | Search using text or CQL (Confluence Query Language) |
| `confluence_get_page` | Get page by ID or title |
| `confluence_get_page_children` | Get child pages of a parent |
| `confluence_get_comments` | Get page comments |
| `confluence_get_labels` | Get page labels |

### Jira (port 3999)

| Tool | Description |
|------|-------------|
| `jira_search` | Query issues using JQL |
| `jira_get_issue` | View issue details, comments, status |
| `jira_get_transitions` | Get available status transitions |
| `jira_get_sprint_issues` | Get issues in a sprint |
| `jira_get_board_issues` | Get issues on an agile board |

### Aha.io (port 4000)

| Tool | Description |
|------|-------------|
| `get_aha_epic` | Get epic by reference (e.g., PROJ-E-123) with features |
| `get_aha_feature` | Get feature by reference with requirements |
| `get_aha_features_for_epic` | List features under an epic |
| `get_aha_requirements` | List requirements under a feature |
| `get_aha_requirement` | Get a specific requirement |
| `search_aha_features` | Search features by name in a product |

---

## CLI Fallback Tools

When MCP tools aren't available, use these CLI wrappers:

| Command | What It Does |
|---|---|
| `npm run api-search "keywords"` | Search Confluence |
| `npm run api-read <id-or-url>` | Read a Confluence page |
| `npm run api-spaces` | List Confluence spaces |
| `npm run aha-read "epic-url"` | Read an Aha.io epic/feature/requirement |

---

## Project Structure

```
personal-research-toolkit/
+-- src/
|   +-- api-search.js              # CLI: search Confluence via MCP
|   +-- api-read.js                # CLI: read Confluence page via MCP
|   +-- api-spaces.js              # CLI: list/browse Confluence spaces
|   +-- aha-api.js                 # Aha.io REST API client
|   +-- aha-api-read.js            # CLI: read Aha.io epic/feature/requirement
|   +-- md-to-pdf.py               # Markdown to PDF converter (PyMuPDF)
+-- aha-mcp-server/
|   +-- server.js                  # Aha.io MCP server (Express + REST API)
|   +-- Dockerfile                 # Docker image definition
|   +-- package.json
|   +-- README.md
+-- .github/
|   +-- copilot-instructions.md    # Copilot agent behavior config
|   +-- context.md                 # Architecture & design philosophy
|   +-- aha-research-context.md    # AHA agent architecture details
|   +-- prompts/
|       +-- research-orchestrator-agent.prompt.md   # Confluence research orchestrator
|       +-- research-sub-agent.prompt.md            # Confluence page reader (sub-agent)
|       +-- aha-research-agent.prompt.md            # AHA epic impact analysis
|       +-- jira-research-agent.prompt.md           # Jira history & pattern analysis
|       +-- lead_developer.md                       # Codebase analysis & code review
+-- output/                        # Research output (gitignored)
+-- .mcp.json                      # MCP server registration
+-- .env.example                   # Environment template
+-- package.json                   # npm scripts and dependencies
```

---

## Auto-Start Behavior

MCP servers auto-restart after reboots:

```
Mac boots
  -> Docker Desktop auto-starts (enable in Docker Desktop > Settings > General)
    -> Containers auto-restart (--restart unless-stopped flag)
      -> Confluence MCP on :3998
      -> Jira MCP on :3999
      -> Aha MCP on :4000
```

Allow ~30 seconds after reboot for Docker to initialize.

---

## Maintenance & Troubleshooting

### Common Commands

```bash
# Check status
docker ps | grep mcp

# View logs
docker logs confluence-mcp
docker logs jira-mcp
docker logs aha-mcp

# Restart all
docker restart confluence-mcp jira-mcp aha-mcp

# Remove and recreate (e.g., after token rotation)
docker rm -f confluence-mcp jira-mcp aha-mcp
# Then re-run the docker run commands from Step 6

# Update Confluence/Jira image
docker pull artifacts.mastercard.int:443/ghcr.io/sooperset/mcp-atlassian:latest
docker rm -f confluence-mcp jira-mcp
# Then re-run docker run commands from Step 6

# Update Aha image
cd aha-mcp-server && docker build -t aha-mcp-server:latest . && cd ..
docker rm -f aha-mcp
# Then re-run docker run command from Step 6
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `docker pull` fails | Log into firewall first: https://stl-nz-auth.mastercard.int/connect/PortalMain |
| Confluence tools not showing in Copilot | Env vars must be `CONFLUENCE_URL` + `CONFLUENCE_PERSONAL_TOKEN` (not `CONFLUENCE_SERVER`/`CONFLUENCE_TOKEN`) |
| 404 on MCP endpoint | Check transport: Confluence/Jira use `/sse` with type `sse`; Aha uses `/mcp` with type `http` |
| 401 Unauthorized | Regenerate expired PAT/API token, update `~/mcp-servers/*.env`, restart container |
| "Discovered 0 tools" | Check env variable names match exactly |
| Port already in use | `lsof -i :3998` / `lsof -i :3999` / `lsof -i :4000` to find conflicting process |
| Containers crash on start | Check logs: `docker logs <container-name> --tail=50` |
| MCP tools disabled in Copilot | Click "Configure Tools" in Copilot Chat and enable the read tools |
| Token expired | Generate new token, update `~/mcp-servers/*.env`, restart container |
| PDF generation fails | Ensure PyMuPDF is installed: `pip3 install PyMuPDF` |

---

## Security Guardrails

- All agents operate in **STRICT READ-ONLY MODE** — no writing, updating, or deleting content in Confluence, Jira, or Aha.io
- Agents will refuse write operations even if explicitly asked
- **Never commit tokens** to source control — tokens are stored in `~/mcp-servers/*.env` with `chmod 600`
- Enable **only read tools** in Copilot's Configure Tools (disable any create/update/delete tools)
- Rotate tokens periodically per security policy

---

## Limitations

- **Aha.io API key** is tied to a specific user — if deactivated, the key stops working
- **Rate limiting**: Aha.io allows 300 req/min per account; keep concurrent agents reasonable
- **Aha.io descriptions**: Returned as HTML from API; stripped to text automatically
- **404 = not found OR access denied**: Aha.io returns 404 for both — check permissions if content seems missing
- **Confluence PAT expiry**: Tokens expire — regenerate and update env files when auth fails

---

## Additional Setup References

| Resource | Link |
|----------|------|
| Setup MCP in VS Code (Jira + Confluence + Bitbucket) | [Confluence](https://confluence.mastercard.int/spaces/~e151858/pages/2366499076) |
| How to connect to MC MCP Servers | [Confluence](https://confluence.mastercard.int/spaces/MPGSBoost/pages/2257631656) |
| Connecting to the Mastercard Confluence MCP | [Confluence](https://confluence.mastercard.int/spaces/PayDK/pages/2427147400) |
| MCP Server for Confluence and Jira with GitHub Copilot | [Confluence](https://confluence.mastercard.int/spaces/~e064062/pages/2443388061) |
| Setup MCP in IntelliJ IDEA | [Confluence](https://confluence.mastercard.int/spaces/~e148157/pages/2399496605) |
| IntelliJ Setup: GitHub Copilot with Confluence MCP | [Confluence](https://confluence.mastercard.int/spaces/MPGSBoost/pages/2299337634) |
| How to setup Docker Desktop | [Confluence](https://confluence.mastercard.int/spaces/DCEDS/pages/2301801331) |

### Adding Bitbucket MCP (Optional)

```bash
# Pull image
docker pull artifacts.mastercard.int/docker-internal-unstable/mc-offers/scm-mcp-server:latest

# Create env file
cat > ~/mcp-servers/bitbucket_mcp.env << 'EOF'
BITBUCKET_SERVER=https://scm.mastercard.int/stash
BITBUCKET_ACCESS_TOKEN=<your-bitbucket-pat>
EOF
chmod 600 ~/mcp-servers/bitbucket_mcp.env

# Start container
docker run -d --name bitbucket-mcp --restart unless-stopped \
  -p 3995:3995 \
  --env-file ~/mcp-servers/bitbucket_mcp.env \
  artifacts.mastercard.int/docker-internal-unstable/mc-offers/scm-mcp-server:latest
```

Generate Bitbucket PAT at: https://scm.mastercard.int/stash > Manage Account > HTTP access tokens

Add to VS Code `mcp.json`:
```json
"bitbucket": {
  "url": "http://localhost:3995/mcp",
  "type": "http"
}
```
