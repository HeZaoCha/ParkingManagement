/**
 * Service Worker 离线缓存
 * 
 * 实现离线缓存策略，提升用户体验
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    const CACHE_NAME = 'parking-management-v1';
    const CACHE_URLS = [
        '/',
        '/static/parking/css/components.css',
        '/static/parking/js/components.js',
        '/static/parking/css/animations.css',
        '/static/parking/js/network_optimization.js',
    ];

    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/static/parking/js/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        });
    }

    // Service Worker 脚本内容（需要单独文件）
    const swScript = `
// Service Worker 脚本
const CACHE_NAME = '${CACHE_NAME}';
const CACHE_URLS = ${JSON.stringify(CACHE_URLS)};

// 安装事件
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(CACHE_URLS);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

// 激活事件
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// 获取事件 - 缓存优先策略
self.addEventListener('fetch', event => {
    // 只处理 GET 请求
    if (event.request.method !== 'GET') {
        return;
    }

    // 跳过非 HTTP/HTTPS 请求
    if (!event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // 如果缓存中有，返回缓存
                if (response) {
                    return response;
                }

                // 否则从网络获取
                return fetch(event.request).then(response => {
                    // 检查响应是否有效
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // 克隆响应
                    const responseToCache = response.clone();

                    // 添加到缓存
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch(() => {
                    // 网络失败，返回离线页面（如果有）
                    return caches.match('/offline.html');
                });
            })
    );
});
`;

    // 创建 Service Worker 文件（需要服务器端支持）
    window.ServiceWorkerManager = {
        install: function() {
            if ('serviceWorker' in navigator) {
                return navigator.serviceWorker.register('/static/parking/js/sw.js');
            }
            return Promise.reject('Service Worker not supported');
        },

        uninstall: function() {
            if ('serviceWorker' in navigator) {
                return navigator.serviceWorker.getRegistrations().then(registrations => {
                    return Promise.all(registrations.map(registration => registration.unregister()));
                });
            }
            return Promise.resolve();
        },

        update: function() {
            if ('serviceWorker' in navigator) {
                return navigator.serviceWorker.getRegistration().then(registration => {
                    if (registration) {
                        return registration.update();
                    }
                });
            }
            return Promise.resolve();
        }
    };
})();

