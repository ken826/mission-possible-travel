/** @type {import('tailwindcss').Config} */
export default {
    content: ["./app/**/*.{html,js}"],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // MHFA Brand Colors
                primary: {
                    DEFAULT: '#00573D',
                    hover: '#004832',
                    light: '#006B4D',
                },
                secondary: {
                    DEFAULT: '#00AA52',
                    hover: '#009547',
                },
                accent: {
                    DEFAULT: '#B2D136',
                    muted: '#C5DC5F',
                },
                // Status Colors
                success: {
                    DEFAULT: '#78BE20',
                    bg: '#e8f5e9',
                },
                warning: {
                    DEFAULT: '#E57200',
                    bg: '#fff8e1',
                },
                error: {
                    DEFAULT: '#AF272F',
                    bg: '#ffebee',
                },
                info: {
                    DEFAULT: '#0072CE',
                    bg: '#e3f2fd',
                },
                // Extended palette
                navy: '#201547',
                teal: '#009CA6',
                aqua: '#00B2A9',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
                mono: ['SF Mono', 'Fira Code', 'Consolas', 'monospace'],
            },
            fontSize: {
                'xs': '0.75rem',
                'sm': '0.875rem',
                'base': '1rem',
                'lg': '1.125rem',
                'xl': '1.25rem',
                '2xl': '1.5rem',
                '3xl': '1.875rem',
                '4xl': '2.25rem',
            },
            spacing: {
                '18': '4.5rem',
                'sidebar': '260px',
                'sidebar-collapsed': '72px',
                'header': '64px',
            },
            borderRadius: {
                'sm': '0.25rem',
                'md': '0.5rem',
                'lg': '0.75rem',
                'xl': '1rem',
                '2xl': '1.5rem',
            },
            boxShadow: {
                'xs': '0 1px 2px rgba(0, 0, 0, 0.05)',
                'sm': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                'focus': '0 0 0 3px rgba(0, 87, 61, 0.3)',
                'focus-error': '0 0 0 3px rgba(175, 39, 47, 0.3)',
            },
            zIndex: {
                'dropdown': '100',
                'sticky': '200',
                'fixed': '300',
                'modal-backdrop': '400',
                'modal': '500',
                'tooltip': '600',
                'toast': '700',
            },
            transitionDuration: {
                'fast': '150ms',
                'normal': '250ms',
                'slow': '350ms',
            },
            transitionTimingFunction: {
                'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
        },
    },
    plugins: [],
}
