/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fridgit: {
          bg: "#F7F9F4",
          surface: "#FFFFFF",
          surfaceAlt: "#F0F4EC",
          primary: "#3D7A5A",
          primaryLight: "#5FA37D",
          primaryPale: "#E8F3ED",
          accent: "#F4A24A",
          accentPale: "#FEF3E2",
          danger: "#E8604C",
          dangerPale: "#FDECEA",
          warning: "#F4A24A",
          text: "#1A2A1E",
          textMid: "#4A6352",
          textMuted: "#8AA898",
          border: "#E2EDE6",
        },
        dracula: {
          bg: "#282a36",
          currentLine: "#44475a",
          surface: "#44475a",
          highlight: "#565969",
          line: "#6272a4",
          fg: "#f8f8f2",
          comment: "#6272a4",
          cyan: "#8be9fd",
          green: "#50fa7b",
          orange: "#ffb86c",
          pink: "#ff79c6",
          purple: "#bd93f9",
          red: "#ff5555",
          yellow: "#f1fa8c",
        }
      },
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        serif: ["'DM Serif Display'", "serif"],
      }
    }
  },
  plugins: [],
}
