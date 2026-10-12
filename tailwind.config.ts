import type { Config } from "tailwindcss";

const withVar = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: withVar("bg"),
        surface: withVar("surface"),
        surface2: withVar("surface2"),
        ink: withVar("ink"),
        muted: withVar("muted"),
        line: withVar("line"),
        pine: withVar("green"),
        pinelt: withVar("greenlt"),
        amberx: withVar("amber"),
        amberlt: withVar("amberlt"),
        info: withVar("blue"),
        infolt: withVar("bluelt"),
        danger: withVar("danger"),
      },
      borderRadius: {
        lg2: "24px",
      },
      boxShadow: {
        soft: "0 12px 32px rgba(20,32,24,.08)",
      },
      fontFamily: {
        sans: [
          "DM Sans",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "Azeret Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
