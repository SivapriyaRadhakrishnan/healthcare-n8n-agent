export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        healthcare: {
          50: '#f4f9ff',
          100: '#e7f1ff',
          200: '#cfe0ff',
          500: '#3b82f6',
          700: '#1d4ed8',
        },
      },
      boxShadow: {
        glow: '0 35px 90px rgba(45, 106, 255, 0.12)',
      },
    },
  },
  plugins: [],
};
