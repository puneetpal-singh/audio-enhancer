/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                apple: {
                    blue: '#007AFF',
                    gray: '#8E8E93',
                    bg: '#1C1C1E',
                    card: 'rgba(28, 28, 30, 0.7)',
                }
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
}
