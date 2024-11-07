function convertVSCodeToNeovim(vsCodeTheme: typeof vscodeTheme) {
  // Helper function to convert hex to rgb
  function hexToRgb(hex: string) {
    hex = hex.replace(/^#/, '')
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    }
  }

  // Helper function to convert VSCode color to Neovim color format
  function convertColor(color: string) {
    if (!color) return 'NONE'
    if (color.startsWith('#')) {
      const rgb = hexToRgb(color)
      return `'#${color.replace('#', '')}'`
    }
    return 'NONE'
  }

  // Initialize the Neovim theme structure
  const neovimTheme = {
    name: vsCodeTheme.name || 'Converted Theme',
    colors: {},
    highlights: {}
  }

  // Convert basic colors
  if (vsCodeTheme.colors) {
    const colorMappings = {
      'editor.background': 'Normal',
      'editor.foreground': 'Normal',
      'editorLineNumber.foreground': 'LineNr',
      'editor.selectionBackground': 'Visual',
      'editor.wordHighlightBackground': 'Search',
      'editorCursor.foreground': 'Cursor',
      'editor.lineHighlightBackground': 'CursorLine',
      'editorWarning.foreground': 'WarningMsg',
      'editorError.foreground': 'ErrorMsg'
    }

    for (const [vsKey, nvimGroup] of Object.entries(colorMappings)) {
      if (vsCodeTheme.colors[vsKey as keyof typeof vsCodeTheme.colors]) {
        neovimTheme.highlights[nvimGroup] = {
          fg: convertColor(vsCodeTheme.colors[vsKey as keyof typeof vsCodeTheme.colors]),
          bg: 'NONE'
        }
      }
    }
  }

  // Convert token colors
  if (vsCodeTheme.tokenColors) {
    const tokenMappings = {
      comment: 'Comment',
      string: 'String',
      number: 'Number',
      keyword: 'Keyword',
      function: 'Function',
      variable: 'Identifier',
      type: 'Type',
      constant: 'Constant'
    }

    vsCodeTheme.tokenColors.forEach((token) => {
      if (!token.scope || !token.settings) return

      const scopes = Array.isArray(token.scope) ? token.scope : [token.scope]
      scopes.forEach((scope) => {
        const normalizedScope = scope.toLowerCase()
        for (const [tokenKey, highlightGroup] of Object.entries(tokenMappings)) {
          if (normalizedScope.includes(tokenKey)) {
            neovimTheme.highlights[highlightGroup] = {
              fg: convertColor(token.settings.foreground),
              bg: convertColor(token.settings.background),
              bold: token.settings.fontStyle?.includes('bold') || false,
              italic: token.settings.fontStyle?.includes('italic') || false,
              underline: token.settings.fontStyle?.includes('underline') || false
            }
          }
        }
      })
    })
  }

  // Generate Lua code
  let luaCode = `-- ${neovimTheme.name}\n`
  luaCode += 'local colors = {\n'

  // Extract unique colors
  const uniqueColors = new Set()
  Object.values(neovimTheme.highlights).forEach((hl) => {
    if (hl.fg !== 'NONE') uniqueColors.add(hl.fg)
    if (hl.bg !== 'NONE') uniqueColors.add(hl.bg)
  })

  // Add colors
  ;[...uniqueColors].forEach((color, index) => {
    luaCode += `    color${index} = ${color},\n`
  })
  luaCode += '}\n\n'

  // Generate highlight groups
  luaCode += 'local highlights = {\n'
  for (const [group, settings] of Object.entries(neovimTheme.highlights)) {
    luaCode += `    ${group} = {\n`
    if (settings.fg !== 'NONE') luaCode += `        fg = ${settings.fg},\n`
    if (settings.bg !== 'NONE') luaCode += `        bg = ${settings.bg},\n`
    if (settings.bold) luaCode += '        bold = true,\n'
    if (settings.italic) luaCode += '        italic = true,\n'
    if (settings.underline) luaCode += '        underline = true,\n'
    luaCode += '    },\n'
  }
  luaCode += '}\n\n'

  // Generate the theme setup function
  luaCode += `return {
    colors = colors,
    highlights = highlights,
    setup = function()
        vim.cmd('hi clear')
        if vim.fn.exists('syntax_on') then
            vim.cmd('syntax reset')
        end
        vim.o.background = '${vsCodeTheme.type || 'dark'}'
        vim.o.termguicolors = true
        
        for group, settings in pairs(highlights) do
            vim.api.nvim_set_hl(0, group, settings)
        end
    end
}\n`

  return luaCode
}

// Example usage:
const vsCodeTheme = {
  name: 'Example Theme',
  type: 'dark',
  colors: {
    'editor.background': '#1E1E1E',
    'editor.foreground': '#D4D4D4'
  },
  tokenColors: [
    {
      scope: ['comment'],
      settings: {
        foreground: '#6A9955',
        fontStyle: 'italic'
      }
    },
    {
      scope: ['string'],
      settings: {
        foreground: '#CE9178'
      }
    }
  ]
}
import vscodeTheme from './theme.json'
import { writeFileSync } from 'fs'
console.log(vscodeTheme.name)
const convertedTheme = convertVSCodeToNeovim(vscodeTheme)

writeFileSync('./convertedTheme.json', JSON.stringify(convertedTheme, null, 2))
