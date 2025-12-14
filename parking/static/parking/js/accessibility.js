/**
 * 无障碍功能增强
 * 
 * 高对比度模式、键盘导航增强等
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 无障碍功能管理器
     */
    class AccessibilityManager {
        constructor() {
            this.highContrast = false;
            this.fontSize = 'normal'; // normal, large, extra-large
            this.init();
        }

        /**
         * 初始化
         */
        init() {
            // 从localStorage恢复设置
            this.highContrast = localStorage.getItem('accessibility_high_contrast') === 'true';
            this.fontSize = localStorage.getItem('accessibility_font_size') || 'normal';

            // 应用设置
            this.applyHighContrast(this.highContrast);
            this.applyFontSize(this.fontSize);

            // 创建无障碍控制面板
            this.createControlPanel();
        }

        /**
         * 切换高对比度模式
         */
        toggleHighContrast() {
            this.highContrast = !this.highContrast;
            this.applyHighContrast(this.highContrast);
            localStorage.setItem('accessibility_high_contrast', this.highContrast.toString());
        }

        /**
         * 应用高对比度模式
         */
        applyHighContrast(enabled) {
            if (enabled) {
                document.documentElement.classList.add('high-contrast');
                document.documentElement.setAttribute('data-high-contrast', 'true');
            } else {
                document.documentElement.classList.remove('high-contrast');
                document.documentElement.removeAttribute('data-high-contrast');
            }
        }

        /**
         * 设置字体大小
         */
        setFontSize(size) {
            this.fontSize = size;
            this.applyFontSize(size);
            localStorage.setItem('accessibility_font_size', size);
        }

        /**
         * 应用字体大小
         */
        applyFontSize(size) {
            document.documentElement.setAttribute('data-font-size', size);
            
            const sizes = {
                'normal': '16px',
                'large': '18px',
                'extra-large': '20px'
            };

            if (sizes[size]) {
                document.documentElement.style.fontSize = sizes[size];
            }
        }

        /**
         * 创建无障碍控制面板
         */
        createControlPanel() {
            // 检查是否已存在
            if (document.getElementById('accessibility-panel')) {
                return;
            }

            const panel = document.createElement('div');
            panel.id = 'accessibility-panel';
            panel.className = 'fixed bottom-6 left-6 z-40';
            panel.innerHTML = `
                <button onclick="window.AccessibilityManager.togglePanel()" 
                        class="w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                        title="无障碍设置"
                        aria-label="无障碍设置">
                    <i class="fas fa-universal-access text-lg"></i>
                </button>
                <div id="accessibility-menu" 
                     class="absolute bottom-16 left-0 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-4 hidden">
                    <h3 class="text-lg font-semibold mb-4 text-slate-900 dark:text-white">无障碍设置</h3>
                    <div class="space-y-3">
                        <div>
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" 
                                       ${this.highContrast ? 'checked' : ''}
                                       onchange="window.AccessibilityManager.toggleHighContrast()"
                                       class="w-4 h-4">
                                <span class="text-slate-700 dark:text-slate-300">高对比度模式</span>
                            </label>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">字体大小</label>
                            <select onchange="window.AccessibilityManager.setFontSize(this.value)"
                                    class="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                                <option value="normal" ${this.fontSize === 'normal' ? 'selected' : ''}>正常</option>
                                <option value="large" ${this.fontSize === 'large' ? 'selected' : ''}>大</option>
                                <option value="extra-large" ${this.fontSize === 'extra-large' ? 'selected' : ''}>特大</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(panel);
        }

        /**
         * 切换面板显示
         */
        togglePanel() {
            const menu = document.getElementById('accessibility-menu');
            if (menu) {
                menu.classList.toggle('hidden');
            }
        }
    }

    // 创建全局实例
    window.AccessibilityManager = new AccessibilityManager();

    // 点击外部关闭菜单
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('accessibility-panel');
        const menu = document.getElementById('accessibility-menu');
        if (panel && menu && !panel.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });
})();

