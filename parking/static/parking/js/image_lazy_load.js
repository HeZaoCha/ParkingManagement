/**
 * 图片懒加载功能
 * 
 * 使用 IntersectionObserver API 实现图片懒加载
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 图片懒加载管理器
     */
    class ImageLazyLoader {
        constructor() {
            this.observer = null;
            this.init();
        }

        init() {
            // 检查浏览器是否支持 IntersectionObserver
            if (!('IntersectionObserver' in window)) {
                // 不支持时，直接加载所有图片
                this.loadAllImages();
                return;
            }

            // 创建 IntersectionObserver
            const options = {
                root: null, // 使用视口作为根
                rootMargin: '50px', // 提前50px开始加载
                threshold: 0.01 // 图片进入视口1%时触发
            };

            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.observer.unobserve(entry.target);
                    }
                });
            }, options);

            // 观察所有懒加载图片
            this.observeImages();
        }

        /**
         * 观察所有懒加载图片
         */
        observeImages() {
            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => {
                this.observer.observe(img);
            });
        }

        /**
         * 加载图片
         */
        loadImage(img) {
            const src = img.getAttribute('data-src');
            if (!src) return;

            // 创建新图片对象预加载
            const image = new Image();
            
            image.onload = () => {
                // 图片加载成功后，替换src
                img.src = src;
                img.removeAttribute('data-src');
                img.classList.add('lazy-loaded');
                img.classList.remove('lazy-loading');
            };

            image.onerror = () => {
                // 加载失败时显示占位符
                img.classList.add('lazy-error');
                img.classList.remove('lazy-loading');
                img.alt = '图片加载失败';
            };

            // 添加加载中状态
            img.classList.add('lazy-loading');
            
            // 开始加载
            image.src = src;
        }

        /**
         * 加载所有图片（兼容模式）
         */
        loadAllImages() {
            const lazyImages = document.querySelectorAll('img[data-src]');
            lazyImages.forEach(img => {
                const src = img.getAttribute('data-src');
                if (src) {
                    img.src = src;
                    img.removeAttribute('data-src');
                }
            });
        }

        /**
         * 刷新观察器（动态添加图片后调用）
         */
        refresh() {
            if (this.observer) {
                this.observeImages();
            }
        }
    }

    // 初始化懒加载
    let lazyLoader = null;

    // DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            lazyLoader = new ImageLazyLoader();
        });
    } else {
        lazyLoader = new ImageLazyLoader();
    }

    // 导出到全局
    window.ImageLazyLoader = ImageLazyLoader;
    window.lazyLoader = lazyLoader;
})();

