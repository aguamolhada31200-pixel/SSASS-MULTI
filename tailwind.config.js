import { fileURLToPath } from "node:url";

// Globs absolutos (forward-slash) — resolvem mesmo quando o Tailwind é
// carregado a partir de um cwd diferente do desta pasta.
const dir = fileURLToPath(new URL(".", import.meta.url)).replace(/\\/g, "/");

/** @type {import('tailwindcss').Config} */
export default {
  content: [`${dir}index.html`, `${dir}src/**/*.{ts,tsx}`],
  theme: {
    extend: {
      colors: {
        // Paleta Madeira (tokens do blueprint decogest)
        primary: "#5C3D2E", // madeira escura — botões, ativo, títulos
        secondary: "#8B5E3C", // madeira média — hover, ícones
        accent: "#F5ECD7", // areia — fundos de secção
        bg: "#FDF8F0", // creme — fundo da app
        sidebar: "#2E1A0E", // madeira muito escura
        "sidebar-text": "#F5ECD7",
        ink: "#1A0F08", // texto principal
        muted: "#6B4C3B", // texto secundário
        line: "#E8D5BE", // bordas
        success: "#4A7C59", // receita/ganho/positivo
        danger: "#9B3A2A", // despesa/perda
        warning: "#C17E2A", // avisos
        card: "#FFFFFF",
        // Exclusivo COMUNIDADE
        gold: "#C8A664",
        "gold-soft": "#E8D5A4",
        "gold-dark": "#9B7F3F",
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.6)" },
          "60%": { opacity: "1", transform: "scale(1.12)" },
          "100%": { transform: "scale(1)" },
        },
        "grow-x": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "pop-in": "pop-in 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "grow-x": "grow-x 0.5s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};
