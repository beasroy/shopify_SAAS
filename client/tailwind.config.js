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
  				'IBM Plex Mono"',
  				'monospace'
  			],
  			'dm-sans': [
  				'DM Sans"',
  				'sans-serif'
  			],
  			roboto: [
  				'Roboto"',
  				'sans-serif'
  			],
  			'ibm-plex-sans': [
  				'IBM Plex Sans"',
  				'sans-serif'
  			],
  			nunito: [
  				'Nunito"',
  				'sans-serif'
  			],
  			'source-sans': [
  				'Source Sans 3"',
  				'sans-serif'
  			]
  		},
  		colors: {
  			primary: {
  				DEFAULT: '#06B6D4',
  				light: '#67E8F9',
  				dark: '#0891B2',
  				bg: '#ECFEFF'
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
  			},
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
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			fadeIn: 'fadeIn 0.5s ease-out',
  			fadeInUp: 'fadeInUp 0.5s ease-out',
  			slideInLeft: 'slideInLeft 0.5s ease-out',
  			slideInRight: 'slideInRight 0.5s ease-out',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
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
