/**
 * 布局系统
 * 
 * 网格系统、页面结构优化、空白空间管理
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 布局管理器
     */
    class LayoutManager {
        constructor() {
            this.gridSystem = {
                columns: 12,
                gap: '1rem',
                breakpoints: {
                    sm: '640px',
                    md: '768px',
                    lg: '1024px',
                    xl: '1280px',
                    '2xl': '1536px'
                }
            };
        }

        /**
         * 创建网格容器
         */
        createGridContainer(options = {}) {
            const {
                columns = this.gridSystem.columns,
                gap = this.gridSystem.gap,
                className = '',
                responsive = true
            } = options;

            const container = document.createElement('div');
            container.className = `grid grid-cols-${columns} gap-${gap.replace('rem', '')} ${className}`;
            
            if (responsive) {
                container.classList.add('grid-responsive');
            }

            return container;
        }

        /**
         * 创建网格项
         */
        createGridItem(options = {}) {
            const {
                colSpan = 1,
                rowSpan = 1,
                className = '',
                content = ''
            } = options;

            const item = document.createElement('div');
            item.className = `col-span-${colSpan} row-span-${rowSpan} ${className}`;
            item.innerHTML = content;

            return item;
        }

        /**
         * 优化页面空白空间
         */
        optimizeWhitespace(container) {
            if (!container) {
                container = document.body;
            }

            // 移除多余的空行和空白
            const walker = document.createTreeWalker(
                container,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                if (node.textContent.trim() === '') {
                    textNodes.push(node);
                }
            }

            textNodes.forEach(node => {
                if (node.parentNode) {
                    node.parentNode.removeChild(node);
                }
            });
        }

        /**
         * 创建响应式布局
         */
        createResponsiveLayout(sections) {
            const container = document.createElement('div');
            container.className = 'responsive-layout';

            sections.forEach(section => {
                const sectionEl = document.createElement('section');
                sectionEl.className = `layout-section ${section.className || ''}`;
                sectionEl.innerHTML = section.content || '';
                container.appendChild(sectionEl);
            });

            return container;
        }

        /**
         * 应用布局优化
         */
        applyLayoutOptimizations() {
            // 优化空白空间
            this.optimizeWhitespace();

            // 添加响应式类
            const containers = document.querySelectorAll('.container, .content-wrapper');
            containers.forEach(container => {
                if (!container.classList.contains('layout-optimized')) {
                    container.classList.add('layout-optimized');
                }
            });
        }
    }

    // 创建全局实例
    window.LayoutManager = new LayoutManager();

    // 自动应用布局优化
    document.addEventListener('DOMContentLoaded', () => {
        window.LayoutManager.applyLayoutOptimizations();
    });
})();

