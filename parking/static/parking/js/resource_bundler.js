/**
 * 资源合并工具
 * 
 * 合并多个CSS/JS文件，减少HTTP请求
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 资源合并器
     */
    class ResourceBundler {
        constructor() {
            this.bundles = {
                css: [],
                js: []
            };
        }

        /**
         * 添加CSS文件
         */
        addCSS(url, inline = false) {
            if (inline) {
                // 内联关键CSS
                this.loadAndInlineCSS(url);
            } else {
                this.bundles.css.push(url);
            }
        }

        /**
         * 添加JS文件
         */
        addJS(url, defer = false, async = false) {
            this.bundles.js.push({ url, defer, async });
        }

        /**
         * 加载并内联CSS
         */
        async loadAndInlineCSS(url) {
            try {
                const response = await fetch(url);
                const css = await response.text();
                
                const style = document.createElement('style');
                style.textContent = css;
                document.head.appendChild(style);
            } catch (error) {
                console.warn(`Failed to inline CSS ${url}:`, error);
                // 回退到普通加载
                this.loadCSS(url);
            }
        }

        /**
         * 加载CSS文件
         */
        loadCSS(url) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            document.head.appendChild(link);
        }

        /**
         * 加载JS文件
         */
        loadJS(url, defer = false, async = false) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.defer = defer;
                script.async = async;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        /**
         * 批量加载资源
         */
        async loadBundles() {
            // 加载CSS
            for (const url of this.bundles.css) {
                this.loadCSS(url);
            }

            // 加载JS（按顺序）
            for (const item of this.bundles.js) {
                await this.loadJS(item.url, item.defer, item.async);
            }
        }

        /**
         * 合并并加载关键CSS
         */
        async bundleCriticalCSS(urls) {
            try {
                const cssContents = await Promise.all(
                    urls.map(url => fetch(url).then(r => r.text()))
                );
                
                const combinedCSS = cssContents.join('\n');
                const style = document.createElement('style');
                style.id = 'critical-css';
                style.textContent = combinedCSS;
                document.head.insertBefore(style, document.head.firstChild);
            } catch (error) {
                console.warn('Failed to bundle critical CSS:', error);
                // 回退到普通加载
                urls.forEach(url => this.loadCSS(url));
            }
        }

        /**
         * 延迟加载非关键CSS
         */
        loadNonCriticalCSS(urls) {
            // 使用requestIdleCallback延迟加载
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    urls.forEach(url => this.loadCSS(url));
                });
            } else {
                // 回退到setTimeout
                setTimeout(() => {
                    urls.forEach(url => this.loadCSS(url));
                }, 2000);
            }
        }
    }

    // 创建全局实例
    window.ResourceBundler = new ResourceBundler();

    // 自动合并关键CSS（如果配置了）
    document.addEventListener('DOMContentLoaded', () => {
        const criticalCSS = document.querySelectorAll('link[rel="preload"][as="style"]');
        if (criticalCSS.length > 0) {
            const urls = Array.from(criticalCSS).map(link => link.href);
            window.ResourceBundler.bundleCriticalCSS(urls);
        }
    });
})();

