/**
 * 键盘导航和快捷键支持
 * 
 * 实现键盘导航、快捷键、无障碍支持等功能
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 键盘导航管理器
     */
    class KeyboardNavigation {
        constructor() {
            this.shortcuts = new Map();
            this.focusableElements = [];
            this.currentFocusIndex = -1;
            this.init();
        }

        init() {
            // 注册默认快捷键
            this.registerDefaultShortcuts();
            
            // 监听键盘事件
            document.addEventListener('keydown', (e) => this.handleKeyDown(e));
            
            // 更新可聚焦元素列表
            this.updateFocusableElements();
            
            // 监听DOM变化，更新可聚焦元素
            const observer = new MutationObserver(() => {
                this.updateFocusableElements();
            });
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        /**
         * 更新可聚焦元素列表
         */
        updateFocusableElements() {
            const selectors = [
                'a[href]',
                'button:not([disabled])',
                'input:not([disabled])',
                'select:not([disabled])',
                'textarea:not([disabled])',
                '[tabindex]:not([tabindex="-1"])',
                '[contenteditable="true"]'
            ].join(', ');
            
            this.focusableElements = Array.from(document.querySelectorAll(selectors))
                .filter(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                });
        }

        /**
         * 注册默认快捷键
         */
        registerDefaultShortcuts() {
            // Ctrl/Cmd + K: 搜索
            this.register('ctrl+k', () => {
                const searchInput = document.querySelector('input[type="search"], input[placeholder*="搜索"], input[placeholder*="Search"]');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }, '打开搜索');

            // Ctrl/Cmd + /: 显示快捷键帮助
            this.register('ctrl+/', () => {
                this.showShortcutsHelp();
            }, '显示快捷键帮助');

            // Esc: 关闭模态框/菜单
            this.register('escape', () => {
                const modals = document.querySelectorAll('.modal, [role="dialog"]');
                modals.forEach(modal => {
                    if (modal.style.display !== 'none') {
                        const closeBtn = modal.querySelector('[data-dismiss="modal"], .close, [aria-label="关闭"]');
                        if (closeBtn) {
                            closeBtn.click();
                        }
                    }
                });
            }, '关闭模态框');

            // Ctrl/Cmd + Enter: 提交表单
            this.register('ctrl+enter', (e) => {
                const form = document.activeElement?.closest('form');
                if (form) {
                    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
                    if (submitBtn && !submitBtn.disabled) {
                        submitBtn.click();
                    }
                }
            }, '提交表单');

            // Alt + N: 新建（如果页面有新建按钮）
            this.register('alt+n', () => {
                const newBtn = document.querySelector('a[href*="add"], a[href*="new"], button[data-action="new"]');
                if (newBtn) {
                    newBtn.click();
                }
            }, '新建');

            // Alt + S: 保存
            this.register('alt+s', (e) => {
                e.preventDefault();
                const form = document.activeElement?.closest('form');
                if (form) {
                    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
                    if (submitBtn && !submitBtn.disabled) {
                        submitBtn.click();
                    }
                }
            }, '保存');
        }

        /**
         * 注册快捷键
         */
        register(key, handler, description = '') {
            this.shortcuts.set(key.toLowerCase(), { handler, description });
        }

        /**
         * 处理键盘按下事件
         */
        handleKeyDown(e) {
            // 忽略在输入框中的快捷键（除了全局快捷键）
            if (this.isInputElement(e.target) && !this.isGlobalShortcut(e)) {
                return;
            }

            const key = this.getKeyString(e);
            const shortcut = this.shortcuts.get(key);
            
            if (shortcut) {
                e.preventDefault();
                e.stopPropagation();
                shortcut.handler(e);
            }

            // 处理键盘导航
            this.handleNavigation(e);
        }

        /**
         * 判断是否为输入元素
         */
        isInputElement(element) {
            const tagName = element.tagName.toLowerCase();
            return tagName === 'input' || 
                   tagName === 'textarea' || 
                   (tagName === 'div' && element.contentEditable === 'true');
        }

        /**
         * 判断是否为全局快捷键
         */
        isGlobalShortcut(e) {
            return (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === '/');
        }

        /**
         * 获取按键字符串
         */
        getKeyString(e) {
            const parts = [];
            
            if (e.ctrlKey) parts.push('ctrl');
            if (e.metaKey) parts.push('meta');
            if (e.altKey) parts.push('alt');
            if (e.shiftKey) parts.push('shift');
            
            const key = e.key.toLowerCase();
            if (key === 'escape') {
                parts.push('escape');
            } else if (key.length === 1) {
                parts.push(key);
            } else {
                parts.push(key);
            }
            
            return parts.join('+');
        }

        /**
         * 处理键盘导航
         */
        handleNavigation(e) {
            // Tab导航由浏览器处理，这里处理其他导航键
            
            // 箭头键导航（在特定容器中）
            if (e.key.startsWith('Arrow')) {
                const container = e.target.closest('[role="menu"], [role="listbox"], .keyboard-nav');
                if (container) {
                    this.handleArrowNavigation(e, container);
                }
            }
        }

        /**
         * 处理箭头键导航
         */
        handleArrowNavigation(e, container) {
            e.preventDefault();
            
            const items = Array.from(container.querySelectorAll('[role="menuitem"], [role="option"], .keyboard-nav-item, a, button'));
            if (items.length === 0) return;
            
            const currentIndex = items.indexOf(document.activeElement);
            let nextIndex = currentIndex;
            
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                nextIndex = (currentIndex + 1) % items.length;
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                nextIndex = (currentIndex - 1 + items.length) % items.length;
            } else if (e.key === 'Home') {
                nextIndex = 0;
            } else if (e.key === 'End') {
                nextIndex = items.length - 1;
            }
            
            if (nextIndex >= 0 && nextIndex < items.length) {
                items[nextIndex].focus();
            }
        }

        /**
         * 显示快捷键帮助
         */
        showShortcutsHelp() {
            const shortcuts = Array.from(this.shortcuts.entries())
                .map(([key, { description }]) => ({ key, description }))
                .filter(s => s.description);
            
            if (shortcuts.length === 0) return;
            
            // 创建帮助模态框
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-labelledby', 'shortcuts-title');
            
            modal.innerHTML = `
                <div class="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-4">
                        <h2 id="shortcuts-title" class="text-xl font-semibold text-slate-900 dark:text-white">
                            快捷键帮助
                        </h2>
                        <button class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" 
                                onclick="this.closest('.fixed').remove()" 
                                aria-label="关闭">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="space-y-2">
                        ${shortcuts.map(({ key, description }) => `
                            <div class="flex justify-between items-center py-2 border-b border-slate-200 dark:border-slate-700">
                                <span class="text-slate-700 dark:text-slate-300">${description}</span>
                                <kbd class="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded text-sm font-mono">
                                    ${key.replace(/\+/g, ' + ').replace(/ctrl/g, 'Ctrl').replace(/alt/g, 'Alt').replace(/shift/g, 'Shift').replace(/meta/g, 'Cmd')}
                                </kbd>
                            </div>
                        `).join('')}
                    </div>
                    <div class="mt-4 text-sm text-slate-500 dark:text-slate-400">
                        按 <kbd class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">Esc</kbd> 关闭
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // 点击外部关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
            // Esc关闭
            const closeHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', closeHandler);
                }
            };
            document.addEventListener('keydown', closeHandler);
            
            // 聚焦关闭按钮
            const closeBtn = modal.querySelector('button');
            if (closeBtn) {
                setTimeout(() => closeBtn.focus(), 100);
            }
        }
    }

    // 初始化键盘导航
    document.addEventListener('DOMContentLoaded', () => {
        window.KeyboardNavigation = new KeyboardNavigation();
    });
})();

