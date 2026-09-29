import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				// Public landing page only — the app keeps the system stack
				ui: ['"Inter Tight"', '"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
			},
			colors: {
				// Navy portal palette. Values live in CSS variables (src/index.css) so the
				// student portal can switch to its light appearance; dark values are the defaults.
				lp: {
					bg: 'rgb(var(--lp-bg) / <alpha-value>)',
					deep: 'rgb(var(--lp-deep) / <alpha-value>)',
					surface: 'rgb(var(--lp-surface) / <alpha-value>)',
					raised: 'rgb(var(--lp-raised) / <alpha-value>)',
					line: 'rgb(var(--lp-line) / <alpha-value>)',
					text: 'rgb(var(--lp-text) / <alpha-value>)',
					soft: 'rgb(var(--lp-soft) / <alpha-value>)',
					mute: 'rgb(var(--lp-mute) / <alpha-value>)',
					blue: 'rgb(var(--lp-blue) / <alpha-value>)',
					sky: 'rgb(var(--lp-sky) / <alpha-value>)',
					cyan: 'rgb(var(--lp-cyan) / <alpha-value>)',
					red: 'rgb(var(--lp-red) / <alpha-value>)',
					green: 'rgb(var(--lp-green) / <alpha-value>)',
					amber: 'rgb(var(--lp-amber) / <alpha-value>)',
					violet: 'rgb(var(--lp-violet) / <alpha-value>)',
					glow: 'rgb(var(--lp-glow) / <alpha-value>)',
					tint: 'rgb(var(--lp-tint) / <alpha-value>)',
				},
				// White flips to ink inside the light portal (and stays white on coloured surfaces)
				white: 'rgb(var(--lp-white, 255 255 255) / <alpha-value>)',
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
