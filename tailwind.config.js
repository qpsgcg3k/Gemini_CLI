/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // As per design_rule.md
        'main-blue': '#3B82F6',   // blue-500
        'dark-blue': '#2563EB',   // blue-600
        'emphasis-blue': '#1D4ED8', // blue-700
        'strong-emphasis-blue': '#1E40AF', // blue-800
        'light-blue': '#EFF6FF',  // blue-50
        'middle-blue': '#DBEAFE', // blue-100
        'text-main': '#111827',     // gray-900
        'text-sub': '#374151',      // gray-700
        'text-caption': '#4B5563', // gray-600
        'text-light': '#6B7280',    // gray-500
        'border-gray': '#D1D5DB',       // gray-300
        'border-light-gray': '#E5E7EB', // gray-200
        'section-bg': '#F9FAFB',   // gray-50
        'success': '#059669',     // green-600
        'warning': '#D97706',     // amber-600
        'error': '#DC2626',       // red-600
        'info': '#1D4ED8',        // blue-700
      },
      borderRadius: {
        // As per design_rule.md
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      spacing: {
        // As per design_rule.md, using rem values assuming 1rem = 16px
        '12.5': '3.125rem', // 50px if needed
      },
      boxShadow: {
        // As per design_rule.md
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.07)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.1)',
      },
      fontSize: {
        // As per design_rule.md
        'xs': ['12px', { lineHeight: '1.5' }],       // leading-normal
        'sm': ['14px', { lineHeight: '1.625' }],    // leading-relaxed
        'base': ['16px', { lineHeight: '1.625' }],   // leading-relaxed
        'lg': ['18px', { lineHeight: '1.5' }],       // leading-normal
        'xl': ['20px', { lineHeight: '1.4' }],       // leading-snug
        '2xl': ['24px', { lineHeight: '1.4' }],      // leading-snug
        '3xl': ['30px', { lineHeight: '1.25' }],     // leading-tight
        '4xl': ['36px', { lineHeight: '1.25' }],     // leading-tight
      },
      lineHeight: {
        'tight': '1.25',
        'snug': '1.4',
        'normal': '1.5',
        'relaxed': '1.625',
        'loose': '2',
      }
    },
  },
  plugins: [],
}
