# Project AGENTS.md - Guidelines for OpenCode

## Cloudflare MCP Server Usage

When you need to interact with Cloudflare Workers builds, logs, or deployments, use the `cloudflare-builds` MCP server:

- **List recent builds**: `List my recent Cloudflare Workers builds. use cloudflare-builds`
- **Get build logs**: `Get the build logs for deployment [ID]. use cloudflare-builds`
- **Check build details**: `Get details for build [UUID]. use cloudflare-builds`
- **List all builds**: `List all builds for my Worker. use cloudflare-builds`

The cloudflare-builds MCP server is authenticated and ready to use. It provides access to Cloudflare Workers Builds API for inspecting and debugging your Workers deployments.

## Other Available MCP Servers

This project has several MCP servers already configured and authenticated:

- **anysearch** - Web search and research capabilities
- **github** - GitHub repository operations
- **vercel** - Vercel deployment and project management
- **Neon** - Neon database operations
- **Google suite** - Gmail, Drive, Docs, Sheets, Calendar
- **tinyfish** - Web automation and browsing

To see all available MCP servers and their status, run: `opencode mcp list`

## General Guidelines

1. When researching or needing current information, use the `anysearch` MCP server
2. For GitHub operations (PRs, issues, code), use the `github` MCP server
3. For Vercel deployments, use the `vercel` MCP server
4. For database operations, use the `Neon` MCP server
5. For Cloudflare Workers build information, use the `cloudflare-builds` MCP server

Always prefix your requests with "use [server-name]" to invoke the appropriate MCP server capabilities.