/**
 * 语言切换器
 * 
 * 实现前端语言切换功能
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 语言切换管理器
     */
    class LanguageSwitcher {
        constructor() {
            this.currentLang = this.getCurrentLanguage();
            this.init();
        }

        /**
         * 获取当前语言
         */
        getCurrentLanguage() {
            // 从cookie或localStorage获取
            const lang = localStorage.getItem('preferred_language') || 
                        document.documentElement.lang || 
                        'zh-hans';
            return lang;
        }

        /**
         * 初始化
         */
        init() {
            // 创建语言切换按钮（如果不存在）
            this.createLanguageSwitcher();
            
            // 应用当前语言
            this.applyLanguage(this.currentLang);
        }

        /**
         * 创建语言切换器
         */
        createLanguageSwitcher() {
            // 检查是否已存在
            if (document.getElementById('language-switcher')) {
                return;
            }

            // 创建语言切换按钮
            const switcher = document.createElement('div');
            switcher.id = 'language-switcher';
            switcher.className = 'fixed bottom-20 right-6 z-40';
            switcher.innerHTML = `
                <button onclick="window.LanguageSwitcher.toggleLanguageMenu()" 
                        class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                        title="切换语言">
                    <i class="fas fa-language text-lg"></i>
                </button>
                <div id="language-menu" 
                     class="absolute bottom-16 right-0 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-2 hidden">
                    <button onclick="window.LanguageSwitcher.switchLanguage('zh-hans')" 
                            class="w-full text-left px-4 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 ${this.currentLang === 'zh-hans' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}">
                        <span class="text-2xl">🇨🇳</span>
                        <span>简体中文</span>
                        ${this.currentLang === 'zh-hans' ? '<i class="fas fa-check ml-auto text-blue-500"></i>' : ''}
                    </button>
                    <button onclick="window.LanguageSwitcher.switchLanguage('en')" 
                            class="w-full text-left px-4 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 ${this.currentLang === 'en' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}">
                        <span class="text-2xl">🇺🇸</span>
                        <span>English</span>
                        ${this.currentLang === 'en' ? '<i class="fas fa-check ml-auto text-blue-500"></i>' : ''}
                    </button>
                </div>
            `;

            document.body.appendChild(switcher);
        }

        /**
         * 切换语言菜单
         */
        toggleLanguageMenu() {
            const menu = document.getElementById('language-menu');
            if (menu) {
                menu.classList.toggle('hidden');
            }
        }

        /**
         * 切换语言
         */
        switchLanguage(lang) {
            if (lang === this.currentLang) {
                this.toggleLanguageMenu();
                return;
            }

            this.currentLang = lang;
            localStorage.setItem('preferred_language', lang);
            
            // 设置HTML lang属性
            document.documentElement.lang = lang;
            
            // 发送请求到服务器切换语言
            this.setLanguageOnServer(lang);
            
            // 应用语言
            this.applyLanguage(lang);
            
            // 关闭菜单
            this.toggleLanguageMenu();
            
            // 显示提示
            if (window.toast) {
                window.toast.success(lang === 'zh-hans' ? '语言已切换为简体中文' : 'Language switched to English', 2000);
            }
        }

        /**
         * 在服务器端设置语言
         */
        setLanguageOnServer(lang) {
            // 发送请求到服务器设置语言cookie
            fetch('/i18n/setlang/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: `language=${lang}`
            }).catch(error => {
                console.warn('设置服务器语言失败:', error);
            });
        }

        /**
         * 获取CSRF Token
         */
        getCsrfToken() {
            const cookie = document.cookie.match(/csrftoken=([^;]+)/);
            return cookie ? cookie[1] : '';
        }

        /**
         * 应用语言
         */
        applyLanguage(lang) {
            // 更新页面文本（如果有翻译）
            // 这里可以扩展为从服务器获取翻译文本
            document.documentElement.lang = lang;
            
            // 触发语言变更事件
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        }
    }

    // 创建全局语言切换器
    window.LanguageSwitcher = new LanguageSwitcher();

    // 点击外部关闭菜单
    document.addEventListener('click', (e) => {
        const switcher = document.getElementById('language-switcher');
        const menu = document.getElementById('language-menu');
        if (switcher && menu && !switcher.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });
})();

