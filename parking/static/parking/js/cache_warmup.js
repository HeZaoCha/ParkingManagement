/**
 * 缓存预热工具
 * 
 * 预加载常用资源，提升用户体验
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 缓存预热管理器
     */
    class CacheWarmup {
        constructor() {
            this.warmupUrls = [];
            this.isWarming = false;
        }

        /**
         * 添加预热URL
         */
        addUrl(url, priority = 'normal') {
            this.warmupUrls.push({ url, priority });
        }

        /**
         * 批量添加预热URL
         */
        addUrls(urls, priority = 'normal') {
            urls.forEach(url => {
                this.addUrl(url, priority);
            });
        }

        /**
         * 执行缓存预热
         */
        async warmup(options = {}) {
            if (this.isWarming) {
                return;
            }

            this.isWarming = true;
            const { 
                maxConcurrent = 3, 
                delay = 100,
                onProgress = null 
            } = options;

            // 按优先级排序
            const priorityOrder = { high: 0, normal: 1, low: 2 };
            this.warmupUrls.sort((a, b) => {
                return priorityOrder[a.priority] - priorityOrder[b.priority];
            });

            // 分批预热
            for (let i = 0; i < this.warmupUrls.length; i += maxConcurrent) {
                const batch = this.warmupUrls.slice(i, i + maxConcurrent);
                
                await Promise.all(
                    batch.map(async (item, index) => {
                        try {
                            // 使用fetch预加载
                            await fetch(item.url, { method: 'HEAD' });
                            
                            if (onProgress) {
                                onProgress(i + index + 1, this.warmupUrls.length);
                            }
                        } catch (error) {
                            console.warn(`Cache warmup failed for ${item.url}:`, error);
                        }
                    })
                );

                // 延迟，避免过载
                if (i + maxConcurrent < this.warmupUrls.length) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }

            this.isWarming = false;
        }

        /**
         * 预热关键资源
         */
        warmupCritical() {
            const criticalUrls = [
                '/parking/dashboard/',
                '/parking/manage/',
                '/static/parking/css/components.css',
                '/static/parking/js/components.js',
            ];

            this.addUrls(criticalUrls, 'high');
            this.warmup({ maxConcurrent: 2 });
        }

        /**
         * 预热用户常用页面
         */
        warmupUserPages(userId) {
            const userUrls = [
                `/parking/dashboard/`,
                `/parking/manage/lots/`,
                `/parking/manage/spaces/`,
            ];

            this.addUrls(userUrls, 'normal');
            this.warmup({ maxConcurrent: 3 });
        }
    }

    // 创建全局实例
    window.CacheWarmup = new CacheWarmup();

    // 页面加载完成后预热关键资源
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // 延迟预热，避免影响首屏加载
            setTimeout(() => {
                window.CacheWarmup.warmupCritical();
            }, 2000);
        });
    } else {
        setTimeout(() => {
            window.CacheWarmup.warmupCritical();
        }, 2000);
    }
})();

