tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            // 主题色通过 CSS 变量注入
            primary: {
              50: 'var(--color-primary-50)',
              100: 'var(--color-primary-100)',
              200: 'var(--color-primary-200)',
              300: 'var(--color-primary-300)',
              400: 'var(--color-primary-400)',
              500: 'var(--color-primary-500)',
              600: 'var(--color-primary-600)',
              700: 'var(--color-primary-700)',
              800: 'var(--color-primary-800)',
              900: 'var(--color-primary-900)',
            }
          },
          fontFamily: {
            sans: ['Noto Sans SC', 'Inter', 'system-ui', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace']
          },
          boxShadow: {
            'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            'glow': '0 0 20px var(--color-primary-400)'
          },
          animation: {
            'fade-in': 'fadeIn 0.3s ease-out',
            'slide-up': 'slideUp 0.4s ease-out',
            'pulse-slow': 'pulse 3s infinite',
            'bounce-subtle': 'bounceSubtle 2s infinite',
            'gradient': 'gradient 8s ease infinite',
          },
          keyframes: {
            fadeIn: {
              '0%': { opacity: '0' },
              '100%': { opacity: '1' }
            },
            slideUp: {
              '0%': { opacity: '0', transform: 'translateY(20px)' },
              '100%': { opacity: '1', transform: 'translateY(0)' }
            },
            bounceSubtle: {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-5px)' }
            },
            gradient: {
              '0%, 100%': { backgroundPosition: '0% 50%' },
              '50%': { backgroundPosition: '100% 50%' }
            }
          }
        }
      }
    }