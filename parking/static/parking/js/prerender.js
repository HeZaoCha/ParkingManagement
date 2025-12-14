/**
 * 预渲染工具
 * 
 * 实现页面预渲染，提升首屏加载速度
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 预渲染管理器
     */
    class PrerenderManager {
        constructor() {
            this.prerenderLinks = [];
            this.init();
        }

        /**
         * 初始化
         */
        init() {
            // 检测是否支持预渲染
            if (!('requestIdleCallback' in window)) {
                return;
            }

            // 预渲染关键页面
            this.prerenderCriticalPages();
        }

        /**
         * 预渲染关键页面
         */
        prerenderCriticalPages() {
            const criticalPages = [
                '/parking/dashboard/',
                '/parking/manage/',
            ];

            // 使用 requestIdleCallback 延迟预渲染
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    criticalPages.forEach(url => {
                        this.prerenderPage(url);
                    });
                }, { timeout: 2000 });
            }
        }

        /**
         * 预渲染单个页面
         */
        prerenderPage(url) {
            // 检查是否已经预渲染
            if (this.prerenderLinks.includes(url)) {
                return;
            }

            // 创建预渲染链接
            const link = document.createElement('link');
            link.rel = 'prerender';
            link.href = url;
            document.head.appendChild(link);

            this.prerenderLinks.push(url);
        }

        /**
         * 预渲染用户可能访问的页面
         */
        prerenderUserPages(userId) {
            const userPages = [
                `/parking/dashboard/`,
                `/parking/manage/lots/`,
                `/parking/manage/spaces/`,
            ];

            userPages.forEach(url => {
                this.prerenderPage(url);
            });
        }

        /**
         * 预渲染链接（鼠标悬停时）
         */
        prerenderOnHover(element) {
            element.addEventListener('mouseenter', () => {
                const url = element.href || element.getAttribute('data-href');
                if (url) {
                    this.prerenderPage(url);
                }
            }, { once: true });
        }

        /**
         * 为所有链接添加预渲染
         */
        enableHoverPrerender(selector = 'a[href^="/"]') {
            const links = document.querySelectorAll(selector);
            links.forEach(link => {
                this.prerenderOnHover(link);
            });
        }
    }

    // 创建全局实例
    window.PrerenderManager = new PrerenderManager();

    // 自动为链接添加预渲染
    document.addEventListener('DOMContentLoaded', () => {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                window.PrerenderManager.enableHoverPrerender();
            });
        }
    });
})();

