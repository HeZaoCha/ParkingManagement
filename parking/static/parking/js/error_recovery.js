/**
 * 错误恢复建议系统
 * 
 * 提供错误恢复建议和自动修复功能
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 错误恢复管理器
     */
    class ErrorRecoveryManager {
        constructor() {
            this.errorPatterns = {
                network: {
                    pattern: /network|fetch|connection|timeout/i,
                    suggestions: [
                        '检查网络连接',
                        '刷新页面重试',
                        '检查防火墙设置',
                        '联系管理员'
                    ],
                    actions: [
                        { text: '重试', action: () => window.location.reload() },
                        { text: '检查网络', action: () => this.checkNetwork() }
                    ]
                },
                validation: {
                    pattern: /validation|invalid|required|format/i,
                    suggestions: [
                        '检查输入格式是否正确',
                        '确保所有必填项已填写',
                        '检查输入长度限制',
                        '查看字段提示信息'
                    ],
                    actions: [
                        { text: '查看帮助', action: () => this.showHelp() }
                    ]
                },
                permission: {
                    pattern: /permission|unauthorized|forbidden|access/i,
                    suggestions: [
                        '检查账户权限',
                        '联系管理员申请权限',
                        '确认是否已登录',
                        '检查账户状态'
                    ],
                    actions: [
                        { text: '重新登录', action: () => window.location.href = '/login/' }
                    ]
                },
                server: {
                    pattern: /server|500|503|502/i,
                    suggestions: [
                        '服务器暂时不可用',
                        '稍后重试',
                        '联系技术支持',
                        '检查服务状态'
                    ],
                    actions: [
                        { text: '稍后重试', action: () => setTimeout(() => window.location.reload(), 5000) }
                    ]
                }
            };
        }

        /**
         * 分析错误并提供建议
         */
        analyzeError(error) {
            const errorMessage = error.message || error.toString();
            const errorType = this.detectErrorType(errorMessage);
            
            if (errorType) {
                return {
                    type: errorType,
                    suggestions: this.errorPatterns[errorType].suggestions,
                    actions: this.errorPatterns[errorType].actions
                };
            }

            return {
                type: 'unknown',
                suggestions: [
                    '发生未知错误',
                    '尝试刷新页面',
                    '清除浏览器缓存',
                    '联系技术支持'
                ],
                actions: [
                    { text: '刷新页面', action: () => window.location.reload() }
                ]
            };
        }

        /**
         * 检测错误类型
         */
        detectErrorType(message) {
            for (const [type, config] of Object.entries(this.errorPatterns)) {
                if (config.pattern.test(message)) {
                    return type;
                }
            }
            return null;
        }

        /**
         * 显示错误恢复建议
         */
        showRecoverySuggestions(error) {
            const analysis = this.analyzeError(error);
            const container = document.createElement('div');
            container.className = 'error-recovery-panel fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-4 z-50';
            container.innerHTML = `
                <div class="flex items-start justify-between mb-3">
                    <h3 class="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <i class="fas fa-exclamation-triangle text-yellow-500"></i>
                        错误恢复建议
                    </h3>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="mb-3">
                    <p class="text-sm text-slate-600 dark:text-slate-400 mb-2">建议操作：</p>
                    <ul class="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                        ${analysis.suggestions.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
                <div class="flex gap-2">
                    ${analysis.actions.map((action, index) => `
                        <button onclick="(${action.action.toString()})(); this.closest('.error-recovery-panel').remove();" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                            ${action.text}
                        </button>
                    `).join('')}
                </div>
            `;

            document.body.appendChild(container);

            // 5秒后自动关闭
            setTimeout(() => {
                if (container.parentElement) {
                    container.remove();
                }
            }, 10000);
        }

        /**
         * 检查网络
         */
        checkNetwork() {
            fetch('/api/health/')
                .then(response => {
                    if (response.ok) {
                        window.Toast?.success('网络连接正常');
                    } else {
                        window.Toast?.error('网络连接异常');
                    }
                })
                .catch(() => {
                    window.Toast?.error('无法连接到服务器');
                });
        }

        /**
         * 显示帮助
         */
        showHelp() {
            // 触发帮助系统
            if (window.HelpSystem) {
                window.HelpSystem.show();
            } else {
                window.Toast?.info('帮助功能正在开发中');
            }
        }

        /**
         * 全局错误处理
         */
        setupGlobalErrorHandler() {
            window.addEventListener('error', (event) => {
                this.showRecoverySuggestions(event.error || new Error(event.message));
            });

            window.addEventListener('unhandledrejection', (event) => {
                this.showRecoverySuggestions(event.reason);
            });
        }
    }

    // 创建全局实例
    window.ErrorRecoveryManager = new ErrorRecoveryManager();

    // 设置全局错误处理
    document.addEventListener('DOMContentLoaded', () => {
        window.ErrorRecoveryManager.setupGlobalErrorHandler();
    });
})();

