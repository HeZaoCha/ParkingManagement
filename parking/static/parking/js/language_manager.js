/**
 * 语言包管理器
 * 
 * 管理多语言翻译和语言包
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 语言包管理器
     */
    class LanguageManager {
        constructor() {
            this.currentLanguage = 'zh-hans';
            this.translations = {};
            this.loadTranslations();
        }

        /**
         * 加载翻译
         */
        async loadTranslations(lang = null) {
            const language = lang || this.currentLanguage || document.documentElement.lang || 'zh-hans';
            
            try {
                // 从服务器加载翻译文件
                const response = await fetch(`/static/locale/${language}/messages.json`);
                if (response.ok) {
                    this.translations[language] = await response.json();
                } else {
                    // 使用默认翻译
                    this.translations[language] = this.getDefaultTranslations(language);
                }
            } catch (error) {
                console.warn('Failed to load translations, using defaults');
                this.translations[language] = this.getDefaultTranslations(language);
            }

            this.currentLanguage = language;
            this.applyTranslations();
        }

        /**
         * 获取默认翻译
         */
        getDefaultTranslations(lang) {
            const defaults = {
                'zh-hans': {
                    'common.save': '保存',
                    'common.cancel': '取消',
                    'common.delete': '删除',
                    'common.edit': '编辑',
                    'common.search': '搜索',
                    'common.submit': '提交',
                    'common.loading': '加载中...',
                    'common.success': '成功',
                    'common.error': '错误',
                    'common.warning': '警告',
                    'common.info': '信息'
                },
                'en': {
                    'common.save': 'Save',
                    'common.cancel': 'Cancel',
                    'common.delete': 'Delete',
                    'common.edit': 'Edit',
                    'common.search': 'Search',
                    'common.submit': 'Submit',
                    'common.loading': 'Loading...',
                    'common.success': 'Success',
                    'common.error': 'Error',
                    'common.warning': 'Warning',
                    'common.info': 'Info'
                }
            };

            return defaults[lang] || defaults['zh-hans'];
        }

        /**
         * 翻译文本
         */
        translate(key, params = {}) {
            const translation = this.translations[this.currentLanguage]?.[key] || key;
            
            // 替换参数
            let result = translation;
            Object.keys(params).forEach(param => {
                result = result.replace(`{${param}}`, params[param]);
            });

            return result;
        }

        /**
         * 应用翻译
         */
        applyTranslations() {
            const elements = document.querySelectorAll('[data-i18n]');
            elements.forEach(element => {
                const key = element.getAttribute('data-i18n');
                const translation = this.translate(key);
                if (translation !== key) {
                    element.textContent = translation;
                }
            });

            // 更新HTML lang属性
            document.documentElement.lang = this.currentLanguage;
        }

        /**
         * 设置语言
         */
        async setLanguage(lang) {
            if (!this.translations[lang]) {
                await this.loadTranslations(lang);
            } else {
                this.currentLanguage = lang;
                this.applyTranslations();
            }

            // 保存到localStorage
            localStorage.setItem('preferred_language', lang);

            // 通知服务器
            try {
                await fetch('/i18n/setlang/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-CSRFToken': this.getCSRFToken()
                    },
                    body: `language=${lang}`
                });
            } catch (error) {
                console.warn('Failed to set language on server:', error);
            }
        }

        /**
         * 获取CSRF Token
         */
        getCSRFToken() {
            const cookie = document.cookie.match(/csrftoken=([^;]+)/);
            return cookie ? cookie[1] : '';
        }

        /**
         * 初始化
         */
        init() {
            // 从localStorage恢复语言偏好
            const savedLanguage = localStorage.getItem('preferred_language');
            if (savedLanguage) {
                this.setLanguage(savedLanguage);
            } else {
                this.loadTranslations();
            }
        }
    }

    // 创建全局实例
    window.LanguageManager = new LanguageManager();

    // 自动初始化
    document.addEventListener('DOMContentLoaded', () => {
        window.LanguageManager.init();
    });
})();

