/**
 * 智能填充工具
 * 
 * 基于历史数据和用户行为实现表单智能填充
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    const STORAGE_PREFIX = 'form_autofill_';
    const MAX_HISTORY = 10; // 最多保存10条历史记录

    /**
     * 智能填充管理器
     */
    class SmartFill {
        constructor() {
            this.history = this.loadHistory();
        }

        /**
         * 加载历史记录
         */
        loadHistory() {
            try {
                const stored = localStorage.getItem(STORAGE_PREFIX + 'history');
                return stored ? JSON.parse(stored) : {};
            } catch {
                return {};
            }
        }

        /**
         * 保存历史记录
         */
        saveHistory() {
            try {
                localStorage.setItem(STORAGE_PREFIX + 'history', JSON.stringify(this.history));
            } catch (error) {
                console.warn('Failed to save autofill history:', error);
            }
        }

        /**
         * 记录表单数据
         */
        recordFormData(formName, data) {
            if (!this.history[formName]) {
                this.history[formName] = [];
            }

            // 检查是否已存在相同数据
            const existingIndex = this.history[formName].findIndex(
                item => JSON.stringify(item) === JSON.stringify(data)
            );

            if (existingIndex >= 0) {
                // 移到最前面
                this.history[formName].splice(existingIndex, 1);
            }

            // 添加到最前面
            this.history[formName].unshift(data);

            // 限制历史记录数量
            if (this.history[formName].length > MAX_HISTORY) {
                this.history[formName] = this.history[formName].slice(0, MAX_HISTORY);
            }

            this.saveHistory();
        }

        /**
         * 获取建议数据
         */
        getSuggestions(formName, fieldName) {
            if (!this.history[formName]) {
                return [];
            }

            const suggestions = new Set();
            this.history[formName].forEach(record => {
                if (record[fieldName]) {
                    suggestions.add(record[fieldName]);
                }
            });

            return Array.from(suggestions).slice(0, 5); // 最多5个建议
        }

        /**
         * 自动填充表单
         */
        autofillForm(form, useLatest = true) {
            const formName = form.name || form.id || 'default';
            
            if (!this.history[formName] || this.history[formName].length === 0) {
                return false;
            }

            const data = useLatest ? this.history[formName][0] : this.history[formName][Math.floor(Math.random() * this.history[formName].length)];

            Object.keys(data).forEach(fieldName => {
                const input = form.querySelector(`[name="${fieldName}"], #${fieldName}`);
                if (input && !input.value) {
                    input.value = data[fieldName];
                    // 触发input事件
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });

            return true;
        }

        /**
         * 显示建议下拉框
         */
        showSuggestions(input, suggestions) {
            // 移除现有建议框
            const existing = document.getElementById('smart-fill-suggestions');
            if (existing) {
                existing.remove();
            }

            if (suggestions.length === 0) {
                return;
            }

            const container = document.createElement('div');
            container.id = 'smart-fill-suggestions';
            container.className = 'absolute z-50 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto';

            suggestions.forEach(suggestion => {
                const item = document.createElement('div');
                item.className = 'px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer';
                item.textContent = suggestion;
                item.addEventListener('click', () => {
                    input.value = suggestion;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    container.remove();
                });
                container.appendChild(item);
            });

            // 定位建议框
            const rect = input.getBoundingClientRect();
            container.style.top = `${rect.bottom + window.scrollY}px`;
            container.style.left = `${rect.left + window.scrollX}px`;
            container.style.width = `${rect.width}px`;

            document.body.appendChild(container);

            // 点击外部关闭
            const closeHandler = (e) => {
                if (!container.contains(e.target) && e.target !== input) {
                    container.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            setTimeout(() => {
                document.addEventListener('click', closeHandler);
            }, 100);
        }

        /**
         * 初始化表单智能填充
         */
        initForm(form) {
            const formName = form.name || form.id || 'default';
            const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea');

            inputs.forEach(input => {
                const fieldName = input.name || input.id;

                // 聚焦时显示建议
                input.addEventListener('focus', () => {
                    const suggestions = this.getSuggestions(formName, fieldName);
                    if (suggestions.length > 0) {
                        this.showSuggestions(input, suggestions);
                    }
                });

                // 输入时过滤建议
                input.addEventListener('input', (e) => {
                    const value = e.target.value;
                    if (value.length > 0) {
                        const suggestions = this.getSuggestions(formName, fieldName)
                            .filter(s => s.toLowerCase().includes(value.toLowerCase()));
                        this.showSuggestions(input, suggestions);
                    } else {
                        const existing = document.getElementById('smart-fill-suggestions');
                        if (existing) {
                            existing.remove();
                        }
                    }
                });
            });

            // 表单提交时记录数据
            form.addEventListener('submit', () => {
                const formData = {};
                inputs.forEach(input => {
                    if (input.name && input.value) {
                        formData[input.name] = input.value;
                    }
                });
                if (Object.keys(formData).length > 0) {
                    this.recordFormData(formName, formData);
                }
            });
        }
    }

    // 创建全局实例
    window.SmartFill = new SmartFill();

    // 自动初始化所有表单
    document.addEventListener('DOMContentLoaded', () => {
        const forms = document.querySelectorAll('form[data-smart-fill]');
        forms.forEach(form => {
            window.SmartFill.initForm(form);
        });
    });
})();

