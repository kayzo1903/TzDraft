/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#1c1917',
        surface: '#292524',
        'surface-elevated': '#44403c',
        primary: '#f97316',
        'primary-hover': '#ea580c',
        'primary-border': '#c2410c',
        foreground: '#fafaf9',
        'text-secondary': '#d6d3d1',
        'text-muted': '#a8a29e',
        'text-subtle': '#78716c',
        'text-disabled': '#57534e',
        border: '#44403c',
        'border-strong': '#57534e',
        danger: '#ef4444',
        success: '#22c55e',
        win: '#10b981',
        warning: '#f59e0b',
        'board-light': '#fdba74',
        'board-dark': '#9a3412',
      },
    },
  },
  plugins: [],
};
