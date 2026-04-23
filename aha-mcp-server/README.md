# Aha.io MCP Server

MCP server that wraps the Aha.io REST API, providing tools to read epics, features, and requirements. Designed to run alongside the Confluence and Jira MCP servers.

## Setup

### 1. Get an Aha.io API Key

1. Go to Aha.io > Settings (gear icon) > Personal > Developer
2. Generate an API key
3. Copy the key

### 2. Create env file

```bash
mkdir -p ~/mcp-servers
cat > ~/mcp-servers/aha_mcp.env << 'EOF'
AHA_BASE_URL=https://mastercard.aha.io
AHA_API_KEY=your-api-key-here
PORT=4000
EOF
```

### 3. Run with Docker

```bash
# Build (from this directory)
docker build -t aha-mcp-server:latest .

# Run
docker run -d --name aha-mcp --restart unless-stopped \
  -p 4000:4000 \
  --env-file ~/mcp-servers/aha_mcp.env \
  aha-mcp-server:latest
```

### 4. Verify

```bash
# Health check
curl http://localhost:4000/health

# List tools
curl -s -X POST http://localhost:4000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Available Tools

| Tool | Description |
|------|-------------|
| `get_aha_epic` | Get epic by reference (e.g., PROJ-E-123) with child features |
| `get_aha_feature` | Get feature by reference (e.g., PROJ-123) with requirements |
| `get_aha_features_for_epic` | List all features under an epic |
| `get_aha_requirements` | List all requirements under a feature |
| `get_aha_requirement` | Get a specific requirement |
| `search_aha_features` | Search features by name in a product |

## Docker Commands

```bash
docker logs aha-mcp              # View logs
docker restart aha-mcp           # Restart
docker stop aha-mcp              # Stop
docker rm -f aha-mcp             # Remove
```

## All Three MCP Servers

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}\t{{.Status}}"

# Expected:
# confluence-mcp   0.0.0.0:3998->3998/tcp   Up
# jira-mcp         0.0.0.0:3999->3999/tcp   Up
# aha-mcp          0.0.0.0:4000->4000/tcp   Up
```
