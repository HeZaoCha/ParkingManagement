// 主题系统管理
    const ThemeManager = {
      // 初始化
      init() {
        this.loadSavedTheme();
        this.loadSavedMode();
        this.updateUI();
        this.watchSystemTheme();
      },
      
      // 加载保存的主题色
      loadSavedTheme() {
        const saved = localStorage.getItem('theme-color') || 'blue-light';
        this.setTheme(saved, false);
        // 根据主题确定色系并显示对应颜色
        this.selectColorToneByTheme(saved);
      },
      
      // 加载保存的显示模式
      loadSavedMode() {
        const saved = localStorage.getItem('theme-mode') || 'system';
        this.setMode(saved, false);
      },
      
      // 设置主题色
      setTheme(theme, save = true) {
        document.documentElement.setAttribute('data-theme', theme);
        if (save) localStorage.setItem('theme-color', theme);
        this.updateThemeColorUI(theme);
        // 根据主题更新色系显示
        this.selectColorToneByTheme(theme);
      },
      
      // 设置显示模式
      setMode(mode, save = true) {
        if (save) localStorage.setItem('theme-mode', mode);
        
        if (mode === 'system') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          document.documentElement.classList.toggle('dark', prefersDark);
          document.documentElement.classList.toggle('light', !prefersDark);
        } else {
          document.documentElement.classList.toggle('dark', mode === 'dark');
          document.documentElement.classList.toggle('light', mode === 'light');
        }
        
        this.updateModeUI(mode);
      },
      
      // 监听系统主题变化
      watchSystemTheme() {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (localStorage.getItem('theme-mode') === 'system') {
            document.documentElement.classList.toggle('dark', e.matches);
            document.documentElement.classList.toggle('light', !e.matches);
          }
        });
      },
      
      // 更新UI状态
      updateUI() {
        const theme = document.documentElement.getAttribute('data-theme');
        const mode = localStorage.getItem('theme-mode') || 'system';
        this.updateThemeColorUI(theme);
        this.updateModeUI(mode);
        // 根据主题确定色系
        this.selectColorToneByTheme(theme);
      },
      
      // 根据主题确定色系
      selectColorToneByTheme(theme) {
        let tone = 'light'; // 默认浅色
        if (theme.includes('-light')) {
          tone = 'light';
        } else if (theme.includes('-dark')) {
          tone = 'dark';
        } else if (theme.includes('-gradient')) {
          tone = 'gradient';
        } else {
          tone = 'standard';
        }
        this.showColorTone(tone);
      },
      
      // 显示指定色系的颜色
      showColorTone(tone) {
        // 隐藏所有颜色按钮
        document.querySelectorAll('.theme-color-btn').forEach(btn => {
          btn.classList.add('hidden');
        });
        // 显示指定色系的颜色
        document.querySelectorAll(`.theme-color-btn[data-tone="${tone}"]`).forEach(btn => {
          btn.classList.remove('hidden');
        });
        // 更新色系按钮UI
        this.updateColorToneUI(tone);
      },
      
      // 更新色系按钮UI
      updateColorToneUI(activeTone) {
        document.querySelectorAll('.color-tone-btn').forEach(btn => {
          if (btn.dataset.tone === activeTone) {
            btn.classList.add('bg-primary-100', 'border-primary-500', 'text-primary-700');
            btn.classList.remove('border-theme');
          } else {
            btn.classList.remove('bg-primary-100', 'border-primary-500', 'text-primary-700');
            btn.classList.add('border-theme');
          }
        });
      },
      
      // 更新主题色按钮UI
      updateThemeColorUI(theme) {
        document.querySelectorAll('.theme-color-btn').forEach(btn => {
          const icon = btn.querySelector('i');
          if (btn.dataset.theme === theme) {
            icon.classList.remove('opacity-0');
            btn.classList.add('ring-2', 'ring-offset-2', 'ring-gray-400');
          } else {
            icon.classList.add('opacity-0');
            btn.classList.remove('ring-2', 'ring-offset-2', 'ring-gray-400');
          }
        });
      },
      
      // 更新模式按钮UI
      updateModeUI(mode) {
        document.querySelectorAll('.mode-btn').forEach(btn => {
          if (btn.dataset.mode === mode) {
            btn.classList.add('bg-primary-100', 'border-primary-500', 'text-primary-700');
            btn.classList.remove('border-theme');
          } else {
            btn.classList.remove('bg-primary-100', 'border-primary-500', 'text-primary-700');
            btn.classList.add('border-theme');
          }
        });
      }
    };
    
    // 全局函数
    function setTheme(theme) { ThemeManager.setTheme(theme); }
    function setMode(mode) { ThemeManager.setMode(mode); }
    function selectColorTone(tone) { ThemeManager.showColorTone(tone); }
    
    let themePanelOpen = false;
    function toggleThemePanel() {
      const panel = document.getElementById('theme-panel');
      themePanelOpen = !themePanelOpen;
      
      if (themePanelOpen) {
        panel.classList.remove('opacity-0', 'invisible', 'translate-y-4');
        panel.classList.add('opacity-100', 'visible', 'translate-y-0');
      } else {
        panel.classList.add('opacity-0', 'invisible', 'translate-y-4');
        panel.classList.remove('opacity-100', 'visible', 'translate-y-0');
      }
    }
    
    // 点击外部关闭面板
    document.addEventListener('click', (e) => {
      const switcher = document.getElementById('theme-switcher');
      if (!switcher.contains(e.target) && themePanelOpen) {
        toggleThemePanel();
      }
    });
    
    // 初始化
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());