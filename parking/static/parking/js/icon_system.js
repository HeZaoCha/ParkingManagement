/**
 * 图标系统
 * 
 * 统一图标管理，支持SVG图标和Font Awesome图标
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * SVG图标库
     */
    const SVG_ICONS = {
        // 车辆相关
        'car': '<path d="M5 11l1.5-4.5h11L19 11m-1.5 4.5h-13c-.8 0-1.5-.7-1.5-1.5v-3c0-.8.7-1.5 1.5-1.5h13c.8 0 1.5.7 1.5 1.5v3c0 .8-.7 1.5-1.5 1.5z"/>',
        'parking': '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>',
        'entry': '<path d="M9 16l2-2m0 0l2-2m-2 2L9 12m2 2l2 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        'exit': '<path d="M15 9l-2-2m0 0l-2-2m2 2L9 12m2-2l2 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        
        // 管理相关
        'settings': '<path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>',
        'dashboard': '<path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>',
        'search': '<path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>',
        
        // 状态相关
        'success': '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        'error': '<path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
        'warning': '<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
        'info': '<path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    };

    /**
     * 图标管理器
     */
    class IconManager {
        constructor() {
            this.iconStyle = 'svg'; // 'svg' 或 'fontawesome'
            this.init();
        }

        /**
         * 初始化
         */
        init() {
            // 从localStorage读取偏好设置
            const savedStyle = localStorage.getItem('icon_style');
            if (savedStyle) {
                this.iconStyle = savedStyle;
            }
        }

        /**
         * 创建SVG图标
         */
        createSVGIcon(name, options = {}) {
            const {
                size = 24,
                color = 'currentColor',
                className = '',
                animated = false
            } = options;

            if (!SVG_ICONS[name]) {
                console.warn(`Icon "${name}" not found in SVG_ICONS`);
                return null;
            }

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', size);
            svg.setAttribute('height', size);
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', color);
            svg.setAttribute('stroke-width', '2');
            svg.setAttribute('stroke-linecap', 'round');
            svg.setAttribute('stroke-linejoin', 'round');
            svg.className = `icon icon-${name} ${className} ${animated ? 'icon-animated' : ''}`;
            svg.innerHTML = SVG_ICONS[name];

            return svg;
        }

        /**
         * 创建Font Awesome图标
         */
        createFAIcon(name, options = {}) {
            const {
                size = '1x',
                className = '',
                animated = false
            } = options;

            const icon = document.createElement('i');
            icon.className = `fas fa-${name} fa-${size} ${className} ${animated ? 'icon-animated' : ''}`;
            return icon;
        }

        /**
         * 创建图标（自动选择类型）
         */
        createIcon(name, options = {}) {
            if (this.iconStyle === 'svg' && SVG_ICONS[name]) {
                return this.createSVGIcon(name, options);
            } else {
                return this.createFAIcon(name, options);
            }
        }

        /**
         * 替换页面中的图标
         */
        replaceIcons(selector = '[data-icon]') {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const iconName = element.getAttribute('data-icon');
                const iconOptions = {
                    size: element.getAttribute('data-icon-size') || 24,
                    color: element.getAttribute('data-icon-color') || 'currentColor',
                    className: element.getAttribute('data-icon-class') || '',
                    animated: element.hasAttribute('data-icon-animated')
                };

                const icon = this.createIcon(iconName, iconOptions);
                if (icon) {
                    element.innerHTML = '';
                    element.appendChild(icon);
                }
            });
        }

        /**
         * 设置图标风格
         */
        setIconStyle(style) {
            if (style === 'svg' || style === 'fontawesome') {
                this.iconStyle = style;
                localStorage.setItem('icon_style', style);
                this.replaceIcons();
            }
        }
    }

    // 创建全局实例
    window.IconManager = new IconManager();

    // 自动替换图标
    document.addEventListener('DOMContentLoaded', () => {
        window.IconManager.replaceIcons();
    });
})();

