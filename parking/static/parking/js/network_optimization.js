/**
 * 网络资源优化工具
 * 
 * 实现请求去重、缓存、批量请求、数据压缩、重试机制、优先级队列、客户端缓存、响应数据压缩等功能
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Updated: 2025-12-14
 * Version: 2.1.0
 */

(function() {
    'use strict';

    // 请求缓存（内存缓存）
    const requestCache = new Map();
    const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

    // 请求去重（防止重复请求）
    const pendingRequests = new Map();

    // 批量请求队列
    const batchQueue = [];
    let batchTimer = null;
    const BATCH_DELAY = 100; // 100ms内的请求会被批量处理

    // 请求优先级队列
    const priorityQueues = {
        high: [],    // 高优先级
        normal: [], // 普通优先级
        low: []      // 低优先级
    };
    let isProcessingQueue = false;

    // 客户端缓存（localStorage）
    const CLIENT_CACHE_PREFIX = 'network_cache_';
    const CLIENT_CACHE_DURATION = 10 * 60 * 1000; // 10分钟客户端缓存

    /**
     * 带缓存的 Fetch 请求
     */
    async function cachedFetch(url, options = {}) {
        const cacheKey = `${options.method || 'GET'}:${url}`;
        const now = Date.now();
        
        // 检查缓存
        if (options.method === 'GET' || !options.method) {
            const cached = requestCache.get(cacheKey);
            if (cached && (now - cached.timestamp) < CACHE_DURATION) {
                return Promise.resolve(new Response(JSON.stringify(cached.data), {
                    status: 200,
                    statusText: 'OK',
                    headers: { 'Content-Type': 'application/json' }
                }));
            }
        }
        
        // 检查是否有相同的请求正在进行
        if (pendingRequests.has(cacheKey)) {
            return pendingRequests.get(cacheKey);
        }
        
        // 发起请求
        const requestPromise = fetch(url, options)
            .then(async response => {
                // 只缓存成功的GET请求
                if (options.method === 'GET' || !options.method) {
                    if (response.ok) {
                        const data = await response.clone().json();
                        requestCache.set(cacheKey, {
                            data: data,
                            timestamp: now
                        });
                    }
                }
                pendingRequests.delete(cacheKey);
                return response;
            })
            .catch(error => {
                pendingRequests.delete(cacheKey);
                throw error;
            });
        
        pendingRequests.set(cacheKey, requestPromise);
        return requestPromise;
    }

    /**
     * 批量请求处理
     */
    function batchRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            batchQueue.push({ url, options, resolve, reject });
            
            // 清除之前的定时器
            if (batchTimer) {
                clearTimeout(batchTimer);
            }
            
            // 设置新的定时器
            batchTimer = setTimeout(() => {
                processBatchQueue();
            }, BATCH_DELAY);
        });
    }

    /**
     * 处理批量请求队列
     */
    async function processBatchQueue() {
        if (batchQueue.length === 0) return;
        
        const requests = batchQueue.splice(0);
        batchTimer = null;
        
        // 按URL分组
        const grouped = {};
        requests.forEach(({ url, options, resolve, reject }) => {
            const key = `${options.method || 'GET'}:${url}`;
            if (!grouped[key]) {
                grouped[key] = { url, options, promises: [] };
            }
            grouped[key].promises.push({ resolve, reject });
        });
        
        // 执行请求
        Object.values(grouped).forEach(async ({ url, options, promises }) => {
            try {
                const response = await cachedFetch(url, options);
                const data = await response.json();
                promises.forEach(({ resolve }) => resolve(new Response(JSON.stringify(data), {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers
                })));
            } catch (error) {
                promises.forEach(({ reject }) => reject(error));
            }
        });
    }

    /**
     * 压缩请求数据（简单的JSON压缩）
     */
    function compressData(data) {
        // 移除空值和未定义的值
        if (typeof data === 'object' && data !== null) {
            const compressed = {};
            for (const key in data) {
                if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
                    compressed[key] = data[key];
                }
            }
            return compressed;
        }
        return data;
    }

    /**
     * 请求重试机制（指数退避）
     */
    async function fetchWithRetry(url, options = {}, maxRetries = 3, retryDelay = 1000) {
        let lastError;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, options);
                
                // 只对5xx错误和网络错误重试
                if (response.ok || (response.status < 500 && response.status >= 400)) {
                    return response;
                }
                
                // 5xx错误，需要重试
                if (response.status >= 500) {
                    throw new Error(`Server error: ${response.status}`);
                }
                
                return response;
            } catch (error) {
                lastError = error;
                
                // 最后一次尝试，直接抛出错误
                if (attempt === maxRetries) {
                    throw error;
                }
                
                // 指数退避：延迟时间 = 基础延迟 * 2^尝试次数
                const delay = retryDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    }

    /**
     * 客户端缓存管理（localStorage）
     */
    const ClientCache = {
        /**
         * 获取缓存
         */
        get(key) {
            try {
                const cached = localStorage.getItem(CLIENT_CACHE_PREFIX + key);
                if (!cached) return null;
                
                const { data, timestamp } = JSON.parse(cached);
                const now = Date.now();
                
                // 检查是否过期
                if (now - timestamp > CLIENT_CACHE_DURATION) {
                    this.remove(key);
                    return null;
                }
                
                return data;
            } catch (error) {
                console.warn('ClientCache.get error:', error);
                return null;
            }
        },
        
        /**
         * 设置缓存
         */
        set(key, data) {
            try {
                const cacheData = {
                    data: data,
                    timestamp: Date.now()
                };
                localStorage.setItem(CLIENT_CACHE_PREFIX + key, JSON.stringify(cacheData));
            } catch (error) {
                // localStorage可能已满，清理旧缓存
                if (error.name === 'QuotaExceededError') {
                    this.clear();
                    try {
                        const cacheData = {
                            data: data,
                            timestamp: Date.now()
                        };
                        localStorage.setItem(CLIENT_CACHE_PREFIX + key, JSON.stringify(cacheData));
                    } catch (e) {
                        console.warn('ClientCache.set error:', e);
                    }
                } else {
                    console.warn('ClientCache.set error:', error);
                }
            }
        },
        
        /**
         * 删除缓存
         */
        remove(key) {
            try {
                localStorage.removeItem(CLIENT_CACHE_PREFIX + key);
            } catch (error) {
                console.warn('ClientCache.remove error:', error);
            }
        },
        
        /**
         * 清空所有缓存
         */
        clear() {
            try {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith(CLIENT_CACHE_PREFIX)) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (error) {
                console.warn('ClientCache.clear error:', error);
            }
        },
        
        /**
         * 清理过期缓存
         */
        cleanExpired() {
            try {
                const keys = Object.keys(localStorage);
                const now = Date.now();
                
                keys.forEach(key => {
                    if (key.startsWith(CLIENT_CACHE_PREFIX)) {
                        const cached = localStorage.getItem(key);
                        if (cached) {
                            try {
                                const { timestamp } = JSON.parse(cached);
                                if (now - timestamp > CLIENT_CACHE_DURATION) {
                                    localStorage.removeItem(key);
                                }
                            } catch (e) {
                                // 无效数据，删除
                                localStorage.removeItem(key);
                            }
                        }
                    }
                });
            } catch (error) {
                console.warn('ClientCache.cleanExpired error:', error);
            }
        }
    };

    /**
     * 处理优先级队列
     */
    async function processPriorityQueue() {
        if (isProcessingQueue) return;
        isProcessingQueue = true;
        
        while (priorityQueues.high.length > 0 || 
               priorityQueues.normal.length > 0 || 
               priorityQueues.low.length > 0) {
            
            // 按优先级顺序处理
            let request = null;
            if (priorityQueues.high.length > 0) {
                request = priorityQueues.high.shift();
            } else if (priorityQueues.normal.length > 0) {
                request = priorityQueues.normal.shift();
            } else if (priorityQueues.low.length > 0) {
                request = priorityQueues.low.shift();
            }
            
            if (request) {
                try {
                    const response = await fetchWithRetry(request.url, request.options, request.maxRetries, request.retryDelay);
                    request.resolve(response);
                } catch (error) {
                    request.reject(error);
                }
            }
            
            // 避免阻塞，让出控制权
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        isProcessingQueue = false;
    }

    /**
     * 优先级请求
     */
    function priorityRequest(url, options = {}, priority = 'normal', maxRetries = 3, retryDelay = 1000) {
        return new Promise((resolve, reject) => {
            const request = {
                url,
                options,
                priority,
                maxRetries,
                retryDelay,
                resolve,
                reject
            };
            
            // 添加到对应优先级队列
            if (priority === 'high') {
                priorityQueues.high.push(request);
            } else if (priority === 'low') {
                priorityQueues.low.push(request);
            } else {
                priorityQueues.normal.push(request);
            }
            
            // 开始处理队列
            processPriorityQueue();
        });
    }

    /**
     * 优化的 AJAX 请求函数（支持重试和客户端缓存）
     */
    async function optimizedRequest(url, options = {}) {
        const cacheKey = `${options.method || 'GET'}:${url}`;
        
        // 检查客户端缓存（仅GET请求）
        if ((options.method === 'GET' || !options.method) && !options.skipClientCache) {
            const cached = ClientCache.get(cacheKey);
            if (cached) {
                return Promise.resolve(new Response(JSON.stringify(cached), {
                    status: 200,
                    statusText: 'OK',
                    headers: { 'Content-Type': 'application/json' }
                }));
            }
        }
        
        // 压缩请求数据
        if (options.body && typeof options.body === 'object') {
            options.body = JSON.stringify(compressData(options.body));
        }
        
        // 添加请求头
        if (!options.headers) {
            options.headers = {};
        }
        options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
        
        // 添加缓存控制
        if (options.method === 'GET' || !options.method) {
            options.headers['Cache-Control'] = 'max-age=300'; // 5分钟
        }
        
        // 使用带重试的fetch
        const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
        const retryDelay = options.retryDelay !== undefined ? options.retryDelay : 1000;
        
        try {
            const response = await fetchWithRetry(url, options, maxRetries, retryDelay);
            
            // 处理响应数据压缩
            if (response.ok && !options.skipDecompression) {
                const contentType = response.headers.get('Content-Type') || '';
                if (contentType.includes('application/json')) {
                    const text = await response.text();
                    try {
                        const data = JSON.parse(text);
                        // 如果数据是压缩格式，解压
                        const decompressed = decompressResponse(data);
                        
                        // 缓存响应（仅GET请求）
                        if ((options.method === 'GET' || !options.method) && !options.skipClientCache) {
                            ClientCache.set(cacheKey, decompressed);
                        }
                        
                        // 返回新的响应对象
                        return new Response(JSON.stringify(decompressed), {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers
                        });
                    } catch {
                        // 如果不是JSON，返回原始响应
                    }
                }
            }
            
            // 缓存响应（仅GET请求）
            if ((options.method === 'GET' || !options.method) && response.ok && !options.skipClientCache) {
                try {
                    const data = await response.clone().json();
                    ClientCache.set(cacheKey, data);
                } catch {
                    // 忽略缓存错误
                }
            }
            
            return response;
        } catch (error) {
            throw error;
        }
    }

    /**
     * 预加载资源
     */
    function preloadResource(url, as = 'fetch') {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = url;
        link.as = as;
        document.head.appendChild(link);
    }

    /**
     * 图片懒加载
     */
    function initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            observer.unobserve(img);
                        }
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    /**
     * 清理过期缓存
     */
    function cleanExpiredCache() {
        const now = Date.now();
        for (const [key, value] of requestCache.entries()) {
            if ((now - value.timestamp) >= CACHE_DURATION) {
                requestCache.delete(key);
            }
        }
    }

    // 定期清理过期缓存（每10分钟）
    setInterval(cleanExpiredCache, 10 * 60 * 1000);

    // 定期清理客户端过期缓存（每5分钟）
    setInterval(() => {
        ClientCache.cleanExpired();
    }, 5 * 60 * 1000);

    // 导出到全局
    window.NetworkOptimization = {
        fetch: optimizedRequest,
        cachedFetch: cachedFetch,
        batchRequest: batchRequest,
        priorityRequest: priorityRequest,
        preload: preloadResource,
        initLazyLoading: initLazyLoading,
        clearCache: () => {
            requestCache.clear();
            ClientCache.clear();
        },
        clearClientCache: () => ClientCache.clear(),
        ClientCache: ClientCache
    };

    // 初始化懒加载
    document.addEventListener('DOMContentLoaded', function() {
        initLazyLoading();
    });
})();

