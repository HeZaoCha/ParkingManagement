/**
 * 骨架屏组件
 * 
 * 用于在数据加载时显示占位内容
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

/**
 * 骨架屏工具类
 */
class SkeletonLoader {
    /**
     * 创建文本骨架屏
     */
    static createText(lines = 3, className = '') {
        const container = document.createElement('div');
        container.className = `skeleton-text-container ${className}`;
        
        for (let i = 0; i < lines; i++) {
            const text = document.createElement('div');
            text.className = 'skeleton skeleton-text';
            
            // 随机宽度
            const widths = ['short', 'medium', 'long'];
            const width = widths[Math.floor(Math.random() * widths.length)];
            text.classList.add(width);
            
            container.appendChild(text);
        }
        
        return container;
    }

    /**
     * 创建标题骨架屏
     */
    static createTitle(size = 'medium') {
        const title = document.createElement('div');
        title.className = `skeleton skeleton-title ${size}`;
        return title;
    }

    /**
     * 创建头像骨架屏
     */
    static createAvatar(size = 'medium') {
        const avatar = document.createElement('div');
        avatar.className = `skeleton skeleton-avatar ${size}`;
        return avatar;
    }

    /**
     * 创建图片骨架屏
     */
    static createImage(shape = 'rect') {
        const image = document.createElement('div');
        image.className = `skeleton skeleton-image ${shape}`;
        return image;
    }

    /**
     * 创建按钮骨架屏
     */
    static createButton(size = 'medium') {
        const button = document.createElement('div');
        button.className = `skeleton skeleton-button ${size}`;
        return button;
    }

    /**
     * 创建卡片骨架屏
     */
    static createCard(content = null) {
        const card = document.createElement('div');
        card.className = 'skeleton-card';
        
        if (content) {
            if (typeof content === 'string') {
                card.innerHTML = content;
            } else if (content instanceof HTMLElement) {
                card.appendChild(content);
            }
        } else {
            // 默认内容
            card.appendChild(this.createTitle());
            card.appendChild(this.createText(3));
            card.appendChild(this.createButton());
        }
        
        return card;
    }

    /**
     * 创建表格骨架屏
     */
    static createTable(rows = 5, cols = 4) {
        const table = document.createElement('table');
        table.className = 'skeleton-table';
        
        // 表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.className = 'skeleton-table-row';
        
        for (let i = 0; i < cols; i++) {
            const th = document.createElement('th');
            th.className = 'skeleton-table-cell';
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton skeleton-text short';
            th.appendChild(skeleton);
            headerRow.appendChild(th);
        }
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // 表体
        const tbody = document.createElement('tbody');
        for (let i = 0; i < rows; i++) {
            const tr = document.createElement('tr');
            tr.className = 'skeleton-table-row';
            
            for (let j = 0; j < cols; j++) {
                const td = document.createElement('td');
                td.className = 'skeleton-table-cell';
                const skeleton = document.createElement('div');
                skeleton.className = 'skeleton skeleton-text medium';
                td.appendChild(skeleton);
                tr.appendChild(td);
            }
            
            tbody.appendChild(tr);
        }
        
        table.appendChild(tbody);
        return table;
    }

    /**
     * 创建列表骨架屏
     */
    static createList(items = 5) {
        const list = document.createElement('div');
        list.className = 'skeleton-list';
        
        for (let i = 0; i < items; i++) {
            const item = document.createElement('div');
            item.className = 'skeleton-list-item';
            
            // 头像
            item.appendChild(this.createAvatar('small'));
            
            // 内容
            const content = document.createElement('div');
            content.className = 'flex-1';
            content.appendChild(this.createText(2));
            item.appendChild(content);
            
            list.appendChild(item);
        }
        
        return list;
    }

    /**
     * 创建统计卡片骨架屏
     */
    static createStatCard() {
        const card = document.createElement('div');
        card.className = 'skeleton-stat-card';
        
        // 头部
        const header = document.createElement('div');
        header.className = 'skeleton-stat-card-header';
        header.appendChild(this.createText(1, 'short'));
        header.appendChild(this.createAvatar('small'));
        card.appendChild(header);
        
        // 数值
        const value = document.createElement('div');
        value.className = 'skeleton skeleton-stat-card-value';
        card.appendChild(value);
        
        // 标签
        const label = document.createElement('div');
        label.className = 'skeleton skeleton-stat-card-label';
        card.appendChild(label);
        
        return card;
    }

    /**
     * 显示骨架屏
     */
    static show(container, skeleton) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        
        if (container && skeleton) {
            container.innerHTML = '';
            if (skeleton instanceof HTMLElement) {
                container.appendChild(skeleton);
            } else {
                container.innerHTML = skeleton;
            }
        }
    }

    /**
     * 隐藏骨架屏
     */
    static hide(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        
        if (container) {
            container.innerHTML = '';
        }
    }
}

// 导出到全局
window.SkeletonLoader = SkeletonLoader;

// 自动初始化（为带有 data-skeleton 属性的元素创建骨架屏）
document.addEventListener('DOMContentLoaded', () => {
    const skeletonElements = document.querySelectorAll('[data-skeleton]');
    skeletonElements.forEach(element => {
        const type = element.getAttribute('data-skeleton');
        const options = element.getAttribute('data-skeleton-options');
        
        let skeleton = null;
        try {
            const opts = options ? JSON.parse(options) : {};
            
            switch (type) {
                case 'text':
                    skeleton = SkeletonLoader.createText(opts.lines || 3);
                    break;
                case 'title':
                    skeleton = SkeletonLoader.createTitle(opts.size || 'medium');
                    break;
                case 'card':
                    skeleton = SkeletonLoader.createCard();
                    break;
                case 'table':
                    skeleton = SkeletonLoader.createTable(opts.rows || 5, opts.cols || 4);
                    break;
                case 'list':
                    skeleton = SkeletonLoader.createList(opts.items || 5);
                    break;
                case 'stat-card':
                    skeleton = SkeletonLoader.createStatCard();
                    break;
                default:
                    skeleton = SkeletonLoader.createCard();
            }
            
            if (skeleton) {
                element.appendChild(skeleton);
            }
        } catch (e) {
            console.error('创建骨架屏失败:', e);
        }
    });
});

