/**
 * Web Workers 工具
 * 
 * 使用 Web Workers 处理重计算任务，避免阻塞主线程
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * Web Worker 管理器
     */
    class WorkerManager {
        constructor() {
            this.workers = new Map();
            this.taskQueue = [];
        }

        /**
         * 创建或获取 Worker
         */
        getWorker(workerName) {
            if (this.workers.has(workerName)) {
                return this.workers.get(workerName);
            }

            // 创建新的 Worker
            const worker = new Worker(`/static/parking/js/workers/${workerName}.js`);
            this.workers.set(workerName, worker);
            return worker;
        }

        /**
         * 执行任务
         */
        executeTask(workerName, data) {
            return new Promise((resolve, reject) => {
                const worker = this.getWorker(workerName);
                
                const messageHandler = (e) => {
                    if (e.data.error) {
                        reject(new Error(e.data.error));
                    } else {
                        resolve(e.data.result);
                    }
                    worker.removeEventListener('message', messageHandler);
                };

                worker.addEventListener('message', messageHandler);
                worker.postMessage(data);
            });
        }

        /**
         * 终止 Worker
         */
        terminateWorker(workerName) {
            if (this.workers.has(workerName)) {
                this.workers.get(workerName).terminate();
                this.workers.delete(workerName);
            }
        }

        /**
         * 终止所有 Worker
         */
        terminateAll() {
            this.workers.forEach((worker, name) => {
                worker.terminate();
            });
            this.workers.clear();
        }
    }

    /**
     * 数据处理 Worker（用于大数据处理）
     */
    function createDataProcessor() {
        const workerCode = `
            self.onmessage = function(e) {
                const { type, data } = e.data;
                
                try {
                    let result;
                    
                    switch(type) {
                        case 'filter':
                            result = data.array.filter(item => {
                                const searchTerm = data.searchTerm.toLowerCase();
                                return Object.values(item).some(val => 
                                    String(val).toLowerCase().includes(searchTerm)
                                );
                            });
                            break;
                            
                        case 'sort':
                            result = [...data.array].sort((a, b) => {
                                const aVal = a[data.key];
                                const bVal = b[data.key];
                                if (data.direction === 'desc') {
                                    return bVal > aVal ? 1 : -1;
                                }
                                return aVal > bVal ? 1 : -1;
                            });
                            break;
                            
                        case 'aggregate':
                            result = data.array.reduce((acc, item) => {
                                const key = item[data.key];
                                acc[key] = (acc[key] || 0) + (item[data.value] || 0);
                                return acc;
                            }, {});
                            break;
                            
                        case 'transform':
                            result = data.array.map(item => {
                                const transformed = {};
                                data.fields.forEach(field => {
                                    transformed[field] = item[field];
                                });
                                return transformed;
                            });
                            break;
                            
                        default:
                            throw new Error('Unknown operation type');
                    }
                    
                    self.postMessage({ result });
                } catch (error) {
                    self.postMessage({ error: error.message });
                }
            };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob));
    }

    /**
     * 计算密集型任务 Worker
     */
    function createCalculator() {
        const workerCode = `
            self.onmessage = function(e) {
                const { operation, data } = e.data;
                
                try {
                    let result;
                    
                    switch(operation) {
                        case 'sum':
                            result = data.reduce((a, b) => a + b, 0);
                            break;
                            
                        case 'average':
                            result = data.reduce((a, b) => a + b, 0) / data.length;
                            break;
                            
                        case 'max':
                            result = Math.max(...data);
                            break;
                            
                        case 'min':
                            result = Math.min(...data);
                            break;
                            
                        case 'statistics':
                            const sum = data.reduce((a, b) => a + b, 0);
                            const avg = sum / data.length;
                            const sorted = [...data].sort((a, b) => a - b);
                            const median = sorted.length % 2 === 0
                                ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                                : sorted[Math.floor(sorted.length / 2)];
                            const variance = data.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / data.length;
                            result = {
                                sum,
                                average: avg,
                                median,
                                min: sorted[0],
                                max: sorted[sorted.length - 1],
                                variance,
                                stdDev: Math.sqrt(variance)
                            };
                            break;
                            
                        default:
                            throw new Error('Unknown operation');
                    }
                    
                    self.postMessage({ result });
                } catch (error) {
                    self.postMessage({ error: error.message });
                }
            };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob));
    }

    // 创建全局实例
    window.WorkerManager = new WorkerManager();

    // 便捷函数
    window.processDataInWorker = async function(type, data) {
        const worker = createDataProcessor();
        return new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.error) {
                    reject(new Error(e.data.error));
                } else {
                    resolve(e.data.result);
                }
                worker.terminate();
            };
            worker.postMessage({ type, data });
        });
    };

    window.calculateInWorker = async function(operation, data) {
        const worker = createCalculator();
        return new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.error) {
                    reject(new Error(e.data.error));
                } else {
                    resolve(e.data.result);
                }
                worker.terminate();
            };
            worker.postMessage({ operation, data });
        });
    };
})();

