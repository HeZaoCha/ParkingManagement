/**
 * 虚拟滚动组件
 * 
 * 用于长列表的性能优化，只渲染可见区域的项目
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 虚拟滚动管理器
     */
    class VirtualScroll {
        constructor(container, options = {}) {
            this.container = typeof container === 'string' ? document.querySelector(container) : container;
            if (!this.container) {
                throw new Error('Container element not found');
            }

            this.itemHeight = options.itemHeight || 50;
            this.overscan = options.overscan || 5; // 额外渲染的项目数
            this.items = options.items || [];
            this.renderItem = options.renderItem || this.defaultRenderItem;
            this.onScroll = options.onScroll || null;

            this.scrollTop = 0;
            this.containerHeight = 0;
            this.visibleStart = 0;
            this.visibleEnd = 0;

            this.init();
        }

        /**
         * 初始化
         */
        init() {
            // 设置容器样式
            this.container.style.position = 'relative';
            this.container.style.overflow = 'auto';
            this.container.style.height = this.container.style.height || '400px';

            // 创建内容容器
            this.content = document.createElement('div');
            this.content.style.position = 'relative';
            this.content.style.height = `${this.items.length * this.itemHeight}px`;
            this.container.appendChild(this.content);

            // 创建可见项目容器
            this.visibleContainer = document.createElement('div');
            this.visibleContainer.style.position = 'absolute';
            this.visibleContainer.style.top = '0';
            this.visibleContainer.style.left = '0';
            this.visibleContainer.style.right = '0';
            this.content.appendChild(this.visibleContainer);

            // 监听滚动事件
            this.container.addEventListener('scroll', () => {
                this.handleScroll();
            });

            // 监听窗口大小变化
            window.addEventListener('resize', () => {
                this.update();
            });

            // 初始渲染
            this.update();
        }

        /**
         * 处理滚动
         */
        handleScroll() {
            this.scrollTop = this.container.scrollTop;
            this.update();
            
            if (this.onScroll) {
                this.onScroll(this.scrollTop);
            }
        }

        /**
         * 更新可见区域
         */
        update() {
            this.containerHeight = this.container.clientHeight;
            const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
            
            // 计算可见范围
            this.visibleStart = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.overscan);
            this.visibleEnd = Math.min(
                this.items.length - 1,
                Math.ceil((this.scrollTop + this.containerHeight) / this.itemHeight) + this.overscan
            );

            // 更新内容高度
            this.content.style.height = `${this.items.length * this.itemHeight}px`;

            // 更新可见容器位置
            this.visibleContainer.style.top = `${this.visibleStart * this.itemHeight}px`;

            // 渲染可见项目
            this.renderVisibleItems();
        }

        /**
         * 渲染可见项目
         */
        renderVisibleItems() {
            // 清空现有内容
            this.visibleContainer.innerHTML = '';

            // 渲染可见范围内的项目
            for (let i = this.visibleStart; i <= this.visibleEnd; i++) {
                if (i >= 0 && i < this.items.length) {
                    const item = this.renderItem(this.items[i], i);
                    if (item) {
                        item.style.position = 'absolute';
                        item.style.top = '0';
                        item.style.left = '0';
                        item.style.right = '0';
                        item.style.height = `${this.itemHeight}px`;
                        this.visibleContainer.appendChild(item);
                    }
                }
            }
        }

        /**
         * 默认渲染函数
         */
        defaultRenderItem(item, index) {
            const div = document.createElement('div');
            div.className = 'virtual-scroll-item';
            div.textContent = item.text || item.toString();
            return div;
        }

        /**
         * 设置项目列表
         */
        setItems(items) {
            this.items = items;
            this.update();
        }

        /**
         * 添加项目
         */
        addItem(item) {
            this.items.push(item);
            this.update();
        }

        /**
         * 滚动到指定索引
         */
        scrollToIndex(index) {
            if (index >= 0 && index < this.items.length) {
                this.container.scrollTop = index * this.itemHeight;
                this.update();
            }
        }

        /**
         * 滚动到顶部
         */
        scrollToTop() {
            this.scrollToIndex(0);
        }

        /**
         * 滚动到底部
         */
        scrollToBottom() {
            this.scrollToIndex(this.items.length - 1);
        }
    }

    // 导出到全局
    window.VirtualScroll = VirtualScroll;
})();

