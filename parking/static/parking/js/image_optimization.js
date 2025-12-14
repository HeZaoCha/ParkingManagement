/**
 * 图片优化工具
 * 
 * 实现响应式图片、WebP格式支持、图片占位符
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 检测浏览器是否支持WebP
     */
    function supportsWebP() {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }

    /**
     * 检测浏览器是否支持AVIF
     */
    function supportsAVIF() {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
        });
    }

    /**
     * 创建响应式图片
     */
    function createResponsiveImage(src, options = {}) {
        const img = document.createElement('img');
        const webpSupported = supportsWebP();
        
        // 设置基础属性
        img.src = src;
        img.alt = options.alt || '';
        img.loading = options.loading || 'lazy';
        img.className = options.className || '';

        // 如果支持WebP，尝试使用WebP版本
        if (webpSupported && options.webpSrc) {
            const webpImg = new Image();
            webpImg.onload = () => {
                img.src = options.webpSrc;
            };
            webpImg.onerror = () => {
                // WebP加载失败，使用原始图片
            };
            webpImg.src = options.webpSrc;
        }

        // 设置响应式srcset
        if (options.srcset) {
            img.srcset = options.srcset;
            img.sizes = options.sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw';
        }

        return img;
    }

    /**
     * 创建图片占位符（使用BlurHash或简单占位符）
     */
    function createImagePlaceholder(width, height, options = {}) {
        const canvas = document.createElement('canvas');
        canvas.width = width || 400;
        canvas.height = height || 300;
        const ctx = canvas.getContext('2d');

        // 创建渐变背景
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, options.color1 || '#f0f0f0');
        gradient.addColorStop(1, options.color2 || '#e0e0e0');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 添加文字（可选）
        if (options.text) {
            ctx.fillStyle = options.textColor || '#999';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(options.text, canvas.width / 2, canvas.height / 2);
        }

        return canvas.toDataURL('image/png');
    }

    /**
     * 优化图片元素
     */
    function optimizeImage(img, options = {}) {
        // 如果图片已经加载，直接返回
        if (img.complete) {
            return Promise.resolve(img);
        }

        return new Promise((resolve, reject) => {
            // 设置占位符
            if (options.placeholder) {
                img.src = options.placeholder;
            } else {
                const placeholder = createImagePlaceholder(
                    img.width || 400,
                    img.height || 300,
                    { text: '加载中...' }
                );
                img.src = placeholder;
            }

            // 加载实际图片
            const actualImg = new Image();
            actualImg.onload = () => {
                img.src = actualImg.src;
                img.classList.add('image-loaded');
                resolve(img);
            };
            actualImg.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            // 如果支持WebP，尝试使用WebP版本
            if (supportsWebP() && options.webpSrc) {
                actualImg.src = options.webpSrc;
            } else {
                actualImg.src = options.src || img.dataset.src || img.src;
            }
        });
    }

    /**
     * 批量优化页面中的图片
     */
    function optimizeAllImages(selector = 'img[data-src]') {
        const images = document.querySelectorAll(selector);
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    optimizeImage(img, {
                        src: img.dataset.src,
                        webpSrc: img.dataset.webpSrc,
                        placeholder: img.dataset.placeholder
                    }).then(() => {
                        imageObserver.unobserve(img);
                    }).catch(error => {
                        console.error('Image optimization failed:', error);
                    });
                }
            });
        }, {
            rootMargin: '50px'
        });

        images.forEach(img => {
            imageObserver.observe(img);
        });
    }

    // 导出到全局
    window.ImageOptimization = {
        supportsWebP,
        supportsAVIF,
        createResponsiveImage,
        createImagePlaceholder,
        optimizeImage,
        optimizeAllImages
    };

    // 自动优化页面中的图片
    document.addEventListener('DOMContentLoaded', () => {
        optimizeAllImages();
    });
})();

