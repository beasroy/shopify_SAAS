import tailwindcssAnimate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
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
				inter: [
					'Inter',
					'sans-serif'
				],
				'ibm-plex-mono': [
					'IBM Plex Mono',
					'monospace'
				],
				'dm-sans': [
					'DM Sans',
					'sans-serif'
				],
				roboto: [
					'Roboto',
					'sans-serif'
				],
				'ibm-plex-sans': [
					'IBM Plex Sans',
					'sans-serif'
				],
				nunito: [
					'Nunito',
					'sans-serif'
				],
				'source-sans': [
					'Source Sans 3',
					'sans-serif'
				],
				// Landing Page Fonts
				'lp-sans': ['var(--font-sans)', 'sans-serif'],
				'lp-mono': ['var(--font-mono)', 'monospace'],
			},
			colors: {
				primary: {
					DEFAULT: '#06B6D4',
					light: '#67E8F9',
					dark: '#0891B2',
					bg: '#ECFEFF',
					foreground: 'hsl(var(--primary-foreground))'
				},
				success: {
					DEFAULT: '#10B981',
					light: '#6EE7B7',
					dark: '#059669',
					bg: '#ECFDF5'
				},
				warning: {
					DEFAULT: '#F59E0B',
					light: '#FCD34D',
					dark: '#D97706',
					bg: '#FFFBEB'
				},
				danger: {
					DEFAULT: '#F43F5E',
					light: '#FDA4AF',
					dark: '#E11D48',
					bg: '#FFF1F2'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
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
				// Landing Page Colors
				brand: {
					blue: "hsl(var(--brand-blue))",
					green: "hsl(var(--brand-green))",
					amber: "hsl(var(--brand-amber))",
					coral: "hsl(var(--brand-coral))",
				},
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
				},
				fadeIn: {
					'0%': {
						opacity: '0'
					},
					'100%': {
						opacity: '1'
					}
				},
				fadeInUp: {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				slideInLeft: {
					'0%': {
						opacity: '0',
						transform: 'translateX(-20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				slideInRight: {
					'0%': {
						opacity: '0',
						transform: 'translateX(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				fadeIn: 'fadeIn 0.5s ease-out',
				fadeInUp: 'fadeInUp 0.5s ease-out',
				slideInLeft: 'slideInLeft 0.5s ease-out',
				slideInRight: 'slideInRight 0.5s ease-out'
			},
			// Landing Page Box Shadows
			boxShadow: {
				'2xs': 'var(--shadow-2xs)',
				xs: 'var(--shadow-xs)',
				sm: 'var(--shadow-sm)',
				md: 'var(--shadow-md)',
				lg: 'var(--shadow-lg)',
				xl: 'var(--shadow-xl)',
				'2xl': 'var(--shadow-2xl)'
			}
		},

	},
	plugins: [tailwindcssAnimate],
	safelist: [
		// Background colors
		'bg-green-500/5',
		'bg-green-500/10',
		'bg-blue-500/5',
		'bg-blue-500/10',
		'bg-indigo-500/5',
		'bg-indigo-500/10',
		'bg-yellow-500/5',
		'bg-yellow-500/10',
		// Border colors
		'border-green-500',
		'border-blue-500',
		'border-indigo-500',
		'border-yellow-500',
		'border-b-green-500', // Add these
		'border-b-blue-500',
		'border-b-indigo-500',
		'border-b-yellow-500',
		// Text colors
		'text-green-500',
		'text-blue-500',
		'text-indigo-500',
		'text-yellow-500',
	]
};





// import type { Config } from "tailwindcss";
// import tailwindcssAnimate from "tailwindcss-animate";

// export default {
//   darkMode: ["class"],
//   content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
//   prefix: "",
//   theme: {
//   	container: {
//   		center: true,
//   		padding: '2rem',
//   		screens: {
//   			'2xl': '1400px'
//   		}
//   	},
//   	extend: {
//   		colors: {
//   			border: 'hsl(var(--border))',
//   			input: 'hsl(var(--input))',
//   			ring: 'hsl(var(--ring))',
//   			background: 'hsl(var(--background))',
//   			foreground: 'hsl(var(--foreground))',
//   			primary: {
//   				DEFAULT: 'hsl(var(--primary))',
//   				foreground: 'hsl(var(--primary-foreground))'
//   			},
//   			secondary: {
//   				DEFAULT: 'hsl(var(--secondary))',
//   				foreground: 'hsl(var(--secondary-foreground))'
//   			},
//   			destructive: {
//   				DEFAULT: 'hsl(var(--destructive))',
//   				foreground: 'hsl(var(--destructive-foreground))'
//   			},
//   			muted: {
//   				DEFAULT: 'hsl(var(--muted))',
//   				foreground: 'hsl(var(--muted-foreground))'
//   			},
//   			accent: {
//   				DEFAULT: 'hsl(var(--accent))',
//   				foreground: 'hsl(var(--accent-foreground))'
//   			},
//   			popover: {
//   				DEFAULT: 'hsl(var(--popover))',
//   				foreground: 'hsl(var(--popover-foreground))'
//   			},
//   			card: {
//   				DEFAULT: 'hsl(var(--card))',
//   				foreground: 'hsl(var(--card-foreground))'
//   			},
//   			sidebar: {
//   				DEFAULT: 'hsl(var(--sidebar-background))',
//   				foreground: 'hsl(var(--sidebar-foreground))',
//   				primary: 'hsl(var(--sidebar-primary))',
//   				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
//   				accent: 'hsl(var(--sidebar-accent))',
//   				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
//   				border: 'hsl(var(--sidebar-border))',
//   				ring: 'hsl(var(--sidebar-ring))'
//   			},
//   			brand: {
//   				blue: 'hsl(var(--brand-blue))',
//   				green: 'hsl(var(--brand-green))',
//   				amber: 'hsl(var(--brand-amber))',
//   				coral: 'hsl(var(--brand-coral))'
//   			}
//   		},
//   		borderRadius: {
//   			lg: 'var(--radius)',
//   			md: 'calc(var(--radius) - 2px)',
//   			sm: 'calc(var(--radius) - 4px)'
//   		},
//   		fontFamily: {
//   			sans: [
//   				'Space Grotesk',
//   				'ui-sans-serif',
//   				'system-ui',
//   				'-apple-system',
//   				'BlinkMacSystemFont',
//   				'Segoe UI',
//   				'Roboto',
//   				'Helvetica Neue',
//   				'Arial',
//   				'Noto Sans',
//   				'sans-serif'
//   			],
//   			serif: [
//   				'Lora',
//   				'ui-serif',
//   				'Georgia',
//   				'Cambria',
//   				'Times New Roman',
//   				'Times',
//   				'serif'
//   			],
//   			mono: [
//   				'Space Mono',
//   				'ui-monospace',
//   				'SFMono-Regular',
//   				'Menlo',
//   				'Monaco',
//   				'Consolas',
//   				'Liberation Mono',
//   				'Courier New',
//   				'monospace'
//   			]
//   		},
//   		keyframes: {
//   			'accordion-down': {
//   				from: {
//   					height: '0'
//   				},
//   				to: {
//   					height: 'var(--radix-accordion-content-height)'
//   				}
//   			},
//   			'accordion-up': {
//   				from: {
//   					height: 'var(--radix-accordion-content-height)'
//   				},
//   				to: {
//   					height: '0'
//   				}
//   			},
//   			'fade-in': {
//   				from: {
//   					opacity: '0',
//   					transform: 'translateY(20px)'
//   				},
//   				to: {
//   					opacity: '1',
//   					transform: 'translateY(0)'
//   				}
//   			},
//   			'fade-in-left': {
//   				from: {
//   					opacity: '0',
//   					transform: 'translateX(-20px)'
//   				},
//   				to: {
//   					opacity: '1',
//   					transform: 'translateX(0)'
//   				}
//   			},
//   			'fade-in-right': {
//   				from: {
//   					opacity: '0',
//   					transform: 'translateX(20px)'
//   				},
//   				to: {
//   					opacity: '1',
//   					transform: 'translateX(0)'
//   				}
//   			},
//   			'scale-in': {
//   				from: {
//   					opacity: '0',
//   					transform: 'scale(0.95)'
//   				},
//   				to: {
//   					opacity: '1',
//   					transform: 'scale(1)'
//   				}
//   			},
//   			'slide-up': {
//   				from: {
//   					opacity: '0',
//   					transform: 'translateY(40px)'
//   				},
//   				to: {
//   					opacity: '1',
//   					transform: 'translateY(0)'
//   				}
//   			},
//   			'pulse-glow': {
//   				'0%, 100%': {
//   					boxShadow: '0 0 20px hsl(217 91% 60% / 0.3)'
//   				},
//   				'50%': {
//   					boxShadow: '0 0 40px hsl(217 91% 60% / 0.5)'
//   				}
//   			},
//   			'float': {
//   				'0%, 100%': {
//   					transform: 'translateY(0)'
//   				},
//   				'50%': {
//   					transform: 'translateY(-10px)'
//   				}
//   			},
//   			'shimmer': {
//   				'0%': {
//   					backgroundPosition: '-200% 0'
//   				},
//   				'100%': {
//   					backgroundPosition: '200% 0'
//   				}
//   			},
//   			'count-up': {
//   				from: {
//   					opacity: '0',
//   					transform: 'translateY(10px)'
//   				},
//   				to: {
//   					opacity: '1',
//   					transform: 'translateY(0)'
//   				}
//   			},
//   			'draw-line': {
//   				from: {
//   					strokeDashoffset: '1000'
//   				},
//   				to: {
//   					strokeDashoffset: '0'
//   				}
//   			}
//   		},
//   		animation: {
//   			'accordion-down': 'accordion-down 0.2s ease-out',
//   			'accordion-up': 'accordion-up 0.2s ease-out',
//   			'fade-in': 'fade-in 0.6s ease-out forwards',
//   			'fade-in-left': 'fade-in-left 0.6s ease-out forwards',
//   			'fade-in-right': 'fade-in-right 0.6s ease-out forwards',
//   			'scale-in': 'scale-in 0.4s ease-out forwards',
//   			'slide-up': 'slide-up 0.8s ease-out forwards',
//   			'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
//   			'float': 'float 3s ease-in-out infinite',
//   			'shimmer': 'shimmer 2s linear infinite',
//   			'count-up': 'count-up 0.5s ease-out forwards',
//   			'draw-line': 'draw-line 2s ease-out forwards'
//   		},
//   		backgroundImage: {
//   			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
//   			'hero-pattern': 'radial-gradient(ellipse at 50% 0%, hsl(217 91% 60% / 0.15) 0%, transparent 50%)',
//   			'mesh-gradient': 'radial-gradient(at 40% 20%, hsl(217 91% 60% / 0.1) 0px, transparent 50%), radial-gradient(at 80% 0%, hsl(262 83% 58% / 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsl(160 84% 39% / 0.1) 0px, transparent 50%)'
//   		},
//   		boxShadow: {
//   			'2xs': 'var(--shadow-2xs)',
//   			xs: 'var(--shadow-xs)',
//   			sm: 'var(--shadow-sm)',
//   			md: 'var(--shadow-md)',
//   			lg: 'var(--shadow-lg)',
//   			xl: 'var(--shadow-xl)',
//   			'2xl': 'var(--shadow-2xl)'
//   		}
//   	}
//   },
//   plugins: [tailwindcssAnimate],
// } satisfies Config;
