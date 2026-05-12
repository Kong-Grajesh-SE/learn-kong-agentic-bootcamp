import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Kong Agentic AI & MCP Bootcamp',
  description: 'Kong Partner Enablement — Agentic AI and MCP: secure MCP endpoints, OAuth2/PKCE, and Agent-to-Agent routing on Konnect.',

  srcDir: '..',
  outDir: '../dist',
  cacheDir: '../.vitepress-cache',

  base: '/learn-kong-agentic-bootcamp/',

  appearance: 'force-dark',
  cleanUrls: true,

  ignoreDeadLinks: true,

  rewrites: {
    'module-01-agentic-mcp/README.md': 'module-01-agentic-mcp/index.md',
  },

  srcExclude: [
    'node_modules/**',
    'dist/**',
    'docs/.vitepress/**',
    '.vitepress-cache/**',
    'README.md',
    '.github/**',
  ],

  head: [
    ['link', { rel: 'icon',           href: '/learn-kong-agentic-bootcamp/favicon.png', type: 'image/png', sizes: '32x32' }],
    ['link', { rel: 'shortcut icon',  href: '/learn-kong-agentic-bootcamp/favicon.png', type: 'image/png' }],
    ['link', { rel: 'apple-touch-icon', href: '/learn-kong-agentic-bootcamp/favicon.png' }],
    ['meta', { name: 'theme-color', content: '#000F06' }],
    ['meta', { property: 'og:title', content: 'Kong Agentic AI & MCP Bootcamp' }],
    ['meta', { property: 'og:description', content: 'Hands-on Agentic AI labs: MCP proxy, OAuth2/PKCE, A2A routing' }],
    ['meta', { property: 'og:image', content: '/learn-kong-agentic-bootcamp/kong-gateway-logo.svg' }],
  ],

  markdown: {
    theme: { light: 'github-light', dark: 'one-dark-pro' },
    lineNumbers: true,
  },

  themeConfig: {
    logo: '/kong-logomark-lime.svg',
    siteTitle: 'Agentic AI & MCP Bootcamp',

    nav: [
      { text: '🏠 Home', link: '/' },
      {
        text: '📚 Module',
        items: [
          { text: '📋 Overview',          link: '/module-01-agentic-mcp/' },
          { text: '🔌 MCP Proxy',         link: '/module-01-agentic-mcp/labs/08-mcp-proxy' },
          { text: '🔐 MCP + OAuth2',      link: '/module-01-agentic-mcp/labs/08-mcp-oauth2' },
          { text: '🤝 A2A Agents',        link: '/module-01-agentic-mcp/labs/08-a2a-agents' },
        ],
      },
      {
        text: '🔗 Resources',
        items: [
          { text: '📖 Agentic AI Docs', link: 'https://developer.konghq.com/ai-gateway/', target: '_blank' },
          { text: '🧩 MCP Proxy Plugin', link: 'https://developer.konghq.com/plugins/ai-mcp-proxy/', target: '_blank' },
          { text: '☁️ Konnect',          link: 'https://cloud.konghq.com', target: '_blank' },
        ],
      },
    ],

    sidebar: [
      {
        text: '🛠️ Agentic AI & MCP',
        collapsed: false,
        items: [
          { text: '📋 Overview',          link: '/module-01-agentic-mcp/' },
          { text: '🔌 Lab: MCP Proxy',    link: '/module-01-agentic-mcp/labs/08-mcp-proxy' },
          { text: '🔐 Lab: MCP + OAuth2', link: '/module-01-agentic-mcp/labs/08-mcp-oauth2' },
          { text: '🤝 Lab: A2A Agents',   link: '/module-01-agentic-mcp/labs/08-a2a-agents' },
        ],
      },
    ],

    editLink: {
      pattern: 'https://github.com/Kong-Grajesh-SE/learn-kong-agentic-bootcamp/edit/main/:path',
      text: 'Edit this page on GitHub',
    },

    lastUpdated: {
      text: 'Updated',
      formatOptions: { dateStyle: 'medium' },
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Kong-Grajesh-SE/learn-kong-agentic-bootcamp' },
    ],

    footer: {
      message: 'Kong Agentic AI & MCP Bootcamp — Partner Enablement',
      copyright: '© Kong Inc. 2026 — The AI Connectivity Company',
    },

    search: { provider: 'local' },
  },
})
