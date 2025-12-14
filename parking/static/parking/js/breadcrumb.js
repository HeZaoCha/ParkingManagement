/**
 * 面包屑导航组件
 * 
 * 自动生成和管理面包屑导航
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 面包屑导航管理器
     */
    class Breadcrumb {
        constructor() {
            this.items = [];
            this.container = null;
        }

        /**
         * 初始化
         */
        init(containerSelector = '[data-breadcrumb]') {
            this.container = document.querySelector(containerSelector);
            if (!this.container) {
                // 如果没有容器，尝试在页面顶部创建
                this.createContainer();
            }
            
            this.generateFromURL();
            this.render();
        }

        /**
         * 创建容器
         */
        createContainer() {
            const container = document.createElement('nav');
            container.setAttribute('aria-label', '面包屑导航');
            container.className = 'breadcrumb-container mb-4';
            container.setAttribute('data-breadcrumb', '');
            
            // 插入到页面主要内容之前
            const main = document.querySelector('main, .main-content, [role="main"]');
            if (main) {
                main.parentNode.insertBefore(container, main);
            } else {
                document.body.insertBefore(container, document.body.firstChild);
            }
            
            this.container = container;
        }

        /**
         * 从URL生成面包屑
         */
        generateFromURL() {
            const path = window.location.pathname;
            const segments = path.split('/').filter(s => s);
            
            this.items = [
                { label: '首页', url: '/', icon: 'fas fa-home' }
            ];
            
            let currentPath = '';
            segments.forEach((segment, index) => {
                currentPath += '/' + segment;
                
                // 解码URL编码
                const decodedSegment = decodeURIComponent(segment);
                
                // 尝试从页面标题或数据属性获取标签
                let label = this.getLabelFromPage(decodedSegment, currentPath);
                
                // 如果没有找到，使用段名
                if (!label) {
                    label = this.formatLabel(decodedSegment);
                }
                
                const isLast = index === segments.length - 1;
                this.items.push({
                    label: label,
                    url: isLast ? null : currentPath,
                    icon: this.getIconForPath(currentPath),
                    active: isLast
                });
            });
        }

        /**
         * 从页面获取标签
         */
        getLabelFromPage(segment, path) {
            // 检查页面标题
            const pageTitle = document.querySelector('h1, .page-title, [data-page-title]');
            if (pageTitle && path === window.location.pathname) {
                return pageTitle.textContent.trim();
            }
            
            // 检查导航链接
            const navLink = document.querySelector(`a[href="${path}"], a[href="${path}/"]`);
            if (navLink) {
                return navLink.textContent.trim();
            }
            
            // 检查数据属性
            const dataLabel = document.querySelector(`[data-breadcrumb-label="${segment}"]`);
            if (dataLabel) {
                return dataLabel.getAttribute('data-breadcrumb-label');
            }
            
            return null;
        }

        /**
         * 格式化标签
         */
        formatLabel(segment) {
            // 移除常见后缀
            segment = segment.replace(/\.html$/, '');
            
            // 替换连字符和下划线为空格
            segment = segment.replace(/[-_]/g, ' ');
            
            // 首字母大写
            return segment.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }

        /**
         * 根据路径获取图标
         */
        getIconForPath(path) {
            const iconMap = {
                '/admin': 'fas fa-cog',
                '/parking': 'fas fa-car',
                '/dashboard': 'fas fa-chart-line',
                '/login': 'fas fa-sign-in-alt',
                '/register': 'fas fa-user-plus',
                '/contact': 'fas fa-envelope',
                '/profile': 'fas fa-user',
                '/settings': 'fas fa-cog'
            };
            
            for (const [key, icon] of Object.entries(iconMap)) {
                if (path.startsWith(key)) {
                    return icon;
                }
            }
            
            return 'fas fa-folder';
        }

        /**
         * 手动设置面包屑项
         */
        setItems(items) {
            this.items = items;
            this.render();
        }

        /**
         * 添加面包屑项
         */
        addItem(label, url = null, icon = null) {
            this.items.push({
                label: label,
                url: url,
                icon: icon,
                active: url === null
            });
            this.render();
        }

        /**
         * 渲染面包屑
         */
        render() {
            if (!this.container) return;
            
            this.container.innerHTML = `
                <ol class="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400" itemscope itemtype="https://schema.org/BreadcrumbList">
                    ${this.items.map((item, index) => {
                        const isLast = index === this.items.length - 1;
                        const icon = item.icon ? `<i class="${item.icon} mr-1"></i>` : '';
                        
                        if (isLast || !item.url) {
                            return `
                                <li class="flex items-center" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
                                    <span class="text-slate-900 dark:text-slate-100 font-medium" itemprop="name">
                                        ${icon}${item.label}
                                    </span>
                                    <meta itemprop="position" content="${index + 1}">
                                </li>
                            `;
                        } else {
                            return `
                                <li class="flex items-center" itemprop="itemListElement" itemscope itemtype="https://schema.org/BreadcrumbList">
                                    <a href="${item.url}" 
                                       class="hover:text-slate-900 dark:hover:text-slate-100 transition-colors" 
                                       itemprop="item">
                                        <span itemprop="name">${icon}${item.label}</span>
                                    </a>
                                    <meta itemprop="position" content="${index + 1}">
                                    <i class="fas fa-chevron-right mx-2 text-slate-400"></i>
                                </li>
                            `;
                        }
                    }).join('')}
                </ol>
            `;
        }
    }

    // 初始化面包屑导航
    document.addEventListener('DOMContentLoaded', () => {
        window.Breadcrumb = new Breadcrumb();
        window.Breadcrumb.init();
    });
})();

