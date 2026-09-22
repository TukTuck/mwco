// SPDX-License-Identifier: MIT
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/ui/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        deck: {
          bg: '#0a0a0a',
          surface: '#111111',
          border: '#1f1f1f',
          header: '#1a1a1a',
          text: '#e0e0e0',
          muted: '#888888',
          paul: '#3b82f6',
          orch: '#8b5cf6',
          terminal: '#22c55e',
          warning: '#eab308',
          error: '#ef4444',
        },
      },
    },
  },
  plugins: [],
};
