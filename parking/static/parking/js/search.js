/**
 * 全局搜索功能
 * 
 * 实现页面内搜索和全局搜索功能
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 全局搜索管理器
     */
    class GlobalSearch {
        constructor() {
            this.searchModal = null;
            this.searchResults = [];
            this.searchIndex = [];
            this.init();
        }

        /**
         * 初始化
         */
        init() {
            // 监听 Ctrl+K 快捷键
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this.showSearchModal();
                }
            });

            // 构建搜索索引
            this.buildSearchIndex();
        }

        /**
         * 构建搜索索引
         */
        buildSearchIndex() {
            // 索引所有可搜索的内容
            const searchableElements = document.querySelectorAll(
                'a[href], button, [data-searchable], h1, h2, h3, h4, h5, h6, p, li, td, th'
            );

            searchableElements.forEach((element, index) => {
                const text = element.textContent.trim();
                if (text && text.length > 2) {
                    const href = element.href || element.getAttribute('href') || '';
                    const tagName = element.tagName.toLowerCase();
                    
                    this.searchIndex.push({
                        id: index,
                        text: text,
                        href: href,
                        tagName: tagName,
                        element: element
                    });
                }
            });
        }

        /**
         * 显示搜索模态框
         */
        showSearchModal() {
            if (this.searchModal) {
                this.searchModal.style.display = 'flex';
                const input = this.searchModal.querySelector('input[type="search"]');
                if (input) {
                    input.focus();
                    input.select();
                }
                return;
            }

            // 创建搜索模态框
            this.searchModal = document.createElement('div');
            this.searchModal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
            this.searchModal.setAttribute('role', 'dialog');
            this.searchModal.setAttribute('aria-modal', 'true');
            this.searchModal.setAttribute('aria-labelledby', 'search-title');

            this.searchModal.innerHTML = `
                <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                    <div class="p-4 border-b border-slate-200 dark:border-slate-700">
                        <div class="flex items-center gap-3">
                            <i class="fas fa-search text-slate-500 dark:text-slate-400"></i>
                            <input type="search" 
                                   id="global-search-input"
                                   placeholder="搜索页面内容、链接、按钮..." 
                                   class="flex-1 outline-none bg-transparent text-slate-900 dark:text-white"
                                   autocomplete="off">
                            <button onclick="window.GlobalSearch.hideSearchModal()" 
                                    class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                    aria-label="关闭">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                    <div id="search-results" class="flex-1 overflow-y-auto p-4">
                        <div class="text-center text-slate-500 dark:text-slate-400 py-8">
                            <i class="fas fa-search text-4xl mb-4"></i>
                            <p>输入关键词开始搜索</p>
                        </div>
                    </div>
                    <div class="p-4 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
                        <div class="flex items-center justify-between">
                            <span>使用 <kbd class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">↑</kbd> <kbd class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">↓</kbd> 导航，<kbd class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">Enter</kbd> 选择</span>
                            <span>按 <kbd class="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded">Esc</kbd> 关闭</span>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(this.searchModal);

            // 绑定事件
            const input = this.searchModal.querySelector('#global-search-input');
            const resultsContainer = this.searchModal.querySelector('#search-results');
            let selectedIndex = -1;

            input.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (query.length > 0) {
                    this.search(query, resultsContainer);
                    selectedIndex = -1;
                } else {
                    resultsContainer.innerHTML = `
                        <div class="text-center text-slate-500 dark:text-slate-400 py-8">
                            <i class="fas fa-search text-4xl mb-4"></i>
                            <p>输入关键词开始搜索</p>
                        </div>
                    `;
                }
            });

            input.addEventListener('keydown', (e) => {
                const results = resultsContainer.querySelectorAll('.search-result-item');
                
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
                    this.updateSelection(results, selectedIndex);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, -1);
                    this.updateSelection(results, selectedIndex);
                } else if (e.key === 'Enter' && selectedIndex >= 0) {
                    e.preventDefault();
                    const selected = results[selectedIndex];
                    if (selected) {
                        const link = selected.querySelector('a');
                        if (link) {
                            link.click();
                        }
                    }
                } else if (e.key === 'Escape') {
                    this.hideSearchModal();
                }
            });

            // 点击外部关闭
            this.searchModal.addEventListener('click', (e) => {
                if (e.target === this.searchModal) {
                    this.hideSearchModal();
                }
            });

            // 聚焦输入框
            setTimeout(() => {
                input.focus();
            }, 100);
        }

        /**
         * 隐藏搜索模态框
         */
        hideSearchModal() {
            if (this.searchModal) {
                this.searchModal.style.display = 'none';
            }
        }

        /**
         * 搜索
         */
        search(query, container) {
            const lowerQuery = query.toLowerCase();
            const results = this.searchIndex.filter(item => {
                return item.text.toLowerCase().includes(lowerQuery) ||
                       item.href.toLowerCase().includes(lowerQuery);
            }).slice(0, 10); // 最多显示10个结果

            if (results.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-slate-500 dark:text-slate-400 py-8">
                        <i class="fas fa-search text-4xl mb-4"></i>
                        <p>未找到匹配结果</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = results.map((item, index) => {
                const highlightedText = this.highlightText(item.text, query);
                const icon = this.getIconForElement(item.tagName, item.href);
                
                return `
                    <div class="search-result-item p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors ${index === 0 ? 'bg-slate-100 dark:bg-slate-700' : ''}" 
                         data-index="${index}">
                        <a href="${item.href || '#'}" class="flex items-center gap-3">
                            <i class="${icon} text-slate-500 dark:text-slate-400 w-5"></i>
                            <div class="flex-1">
                                <div class="text-slate-900 dark:text-white font-medium">${highlightedText}</div>
                                ${item.href ? `<div class="text-xs text-slate-500 dark:text-slate-400 mt-1">${item.href}</div>` : ''}
                            </div>
                        </a>
                    </div>
                `;
            }).join('');

            // 绑定点击事件
            container.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const link = item.querySelector('a');
                    if (link && link.href !== '#') {
                        window.location.href = link.href;
                    }
                });
            });
        }

        /**
         * 高亮文本
         */
        highlightText(text, query) {
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
        }

        /**
         * 获取元素图标
         */
        getIconForElement(tagName, href) {
            if (href) {
                if (href.startsWith('/admin')) return 'fas fa-cog';
                if (href.startsWith('/parking')) return 'fas fa-car';
                return 'fas fa-link';
            }
            if (tagName.startsWith('h')) return 'fas fa-heading';
            if (tagName === 'button') return 'fas fa-hand-pointer';
            return 'fas fa-file-alt';
        }

        /**
         * 更新选择
         */
        updateSelection(results, selectedIndex) {
            results.forEach((item, index) => {
                if (index === selectedIndex) {
                    item.classList.add('bg-slate-100', 'dark:bg-slate-700');
                } else {
                    item.classList.remove('bg-slate-100', 'dark:bg-slate-700');
                }
            });
        }
    }

    // 创建全局搜索实例
    window.GlobalSearch = new GlobalSearch();
})();

