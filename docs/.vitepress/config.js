import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Kong Agentic AI Bootcamp',
  description: 'Kong Partner Enablement - Agentic AI: MCP Proxy (4 modes), MCP OAuth2/PKCE, Agent-to-Agent routing, and AI Custom Guardrail on Kong 3.14+.',

  srcDir: '..',
  outDir: '../dist',
  cacheDir: '../.vitepress-cache',

  base: '/learn-kong-agentic-bootcamp/',

  appearance: 'force-dark',
  cleanUrls: true,

  ignoreDeadLinks: true,

  rewrites: {
    'module-01-mcp-proxy/README.md': 'module-01-mcp-proxy/index.md',
    'module-02-mcp-oauth2/README.md': 'module-02-mcp-oauth2/index.md',
    'module-03-a2a-agents/README.md': 'module-03-a2a-agents/index.md',
    'module-04-custom-guardrail/README.md': 'module-04-custom-guardrail/index.md',
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
    ['meta', { property: 'og:title', content: 'Kong Agentic AI Bootcamp' }],
    ['meta', { property: 'og:description', content: 'Hands-on Agentic AI labs: MCP Proxy (4 modes), OAuth2/PKCE, A2A routing, AI Custom Guardrail' }],
    ['meta', { property: 'og:image', content: '/learn-kong-agentic-bootcamp/kong-gateway-logo.svg' }],
  ],

  markdown: {
    theme: { light: 'github-light', dark: 'one-dark-pro' },
    lineNumbers: true,
  },

  themeConfig: {
    logo: '/kong-logomark-lime.svg',
    siteTitle: 'Agentic AI Bootcamp',

    nav: [
      { text: '🏠 Home', link: '/' },
      {
        text: '🚀 Getting Started',
        items: [
          { text: '✅ Prerequisites', link: '/prerequisites' },
          { text: '📦 Lab Resources', link: '/resources' },
        items: [
          { text: '01 - MCP Proxy (4 modes)',    link: '/module-01-mcp-proxy/' },
          { text: '02 - MCP + OAuth2',           link: '/module-02-mcp-oauth2/' },
          { text: '03 - A2A Agent Routing',      link: '/module-03-a2a-agents/' },
          { text: '04 - AI Custom Guardrail',    link: '/module-04-custom-guardrail/' },
        ],
      },

      {
        text: '🔗 Resources',
        items: [
          { text: '📖 Agentic AI Docs',             link: 'https://developer.konghq.com/ai-gateway/', target: '_blank' },
          { text: '🔌 ai-mcp-proxy plugin',          link: 'https://developer.konghq.com/plugins/ai-mcp-proxy/', target: '_blank' },
          { text: '🔐 ai-mcp-oauth2 plugin',         link: 'https://developer.konghq.com/plugins/ai-mcp-oauth2/', target: '_blank' },
          { text: '🛡️ ai-custom-guardrail plugin',   link: 'https://developer.konghq.com/plugins/ai-custom-guardrail/', target: '_blank' },
          { text: '☁️ Konnect',                      link: 'https://cloud.konghq.com', target: '_blank' },
        ],
      },
      { text: '🏠 All Bootcamps', link: 'https://kong-grajesh-se.github.io/learn-kong-bootcamps/', target: '_blank' },
    ],

    sidebar: [
      {
        text: '🚀 Getting Started',
        collapsed: false,
        items: [
          { text: '📋 Prerequisites', link: '/prerequisites' },
          { text: '📦 Lab Resources', link: '/resources' },
        ],
      },
      {
        text: '🔌 Module 01 - MCP Proxy',
        collapsed: false,
        items: [
          { text: 'Overview',                         link: '/module-01-mcp-proxy/' },
          { text: 'Lab 01-A: Passthrough Listener',   link: '/module-01-mcp-proxy/labs/01-passthrough-listener' },
          { text: 'Lab 01-B: Conversion Listener',    link: '/module-01-mcp-proxy/labs/01-conversion-listener' },
          { text: 'Lab 01-C: Conversion Aggregation', link: '/module-01-mcp-proxy/labs/01-conversion-aggregation' },
        ],
      },
      {
        text: '🔐 Module 02 - MCP + OAuth2',
        collapsed: false,
        items: [
          { text: 'Overview',                link: '/module-02-mcp-oauth2/' },
          { text: 'Lab 02-A: MCP + OAuth2',  link: '/module-02-mcp-oauth2/labs/02-mcp-oauth2' },
        ],
      },
      {
        text: '🤝 Module 03 - A2A Agent Routing',
        collapsed: false,
        items: [
          { text: 'Overview',               link: '/module-03-a2a-agents/' },
          { text: 'Lab 03-A: A2A Routing',  link: '/module-03-a2a-agents/labs/03-a2a-routing' },
        ],
      },
      {
        text: '🛡️ Module 04 - AI Custom Guardrail',
        collapsed: false,
        items: [
          { text: 'Overview',                    link: '/module-04-custom-guardrail/' },
          { text: 'Lab 04-A: Input Guardrail',   link: '/module-04-custom-guardrail/labs/04-input-guardrail' },
          { text: 'Lab 04-B: Output Guardrail',  link: '/module-04-custom-guardrail/labs/04-output-guardrail' },
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
      message: 'Kong Agentic AI Bootcamp - Partner Enablement',
      copyright: '© Kong Inc. 2026 - The AI Connectivity Company',
    },

    search: { provider: 'local' },
  },
})
