/**
 * 统一组件库
 * 
 * 提供可复用的UI组件和工具函数
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

/**
 * Toast 通知组件
 */
class Toast {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // 创建容器
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'fixed top-4 right-4 z-50 space-y-2';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        toast.className = `${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md animate-slide-in-right`;
        toast.innerHTML = `
            <i class="fas ${icons[type]} text-xl"></i>
            <span class="flex-1">${message}</span>
            <button class="text-white hover:text-gray-200" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        this.container.appendChild(toast);

        // 自动移除
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slide-out-right 0.3s ease-out';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);

        return toast;
    }

    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration || 5000);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

// 全局 Toast 实例
const toast = new Toast();

/**
 * 加载指示器组件
 */
class LoadingSpinner {
    constructor() {
        this.overlay = null;
    }

    show(message = '加载中...') {
        if (this.overlay) {
            this.hide();
        }

        this.overlay = document.createElement('div');
        this.overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
        this.overlay.innerHTML = `
            <div class="bg-slate-800 rounded-lg p-6 flex flex-col items-center gap-4">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
                <p class="text-white">${message}</p>
            </div>
        `;
        document.body.appendChild(this.overlay);
    }

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
}

// 全局 LoadingSpinner 实例
const loadingSpinner = new LoadingSpinner();

/**
 * 确认对话框组件
 */
class ConfirmDialog {
    show(message, title = '确认', confirmText = '确认', cancelText = '取消') {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
            overlay.innerHTML = `
                <div class="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 class="text-xl font-semibold text-white mb-4">${title}</h3>
                    <p class="text-slate-300 mb-6">${message}</p>
                    <div class="flex gap-3 justify-end">
                        <button class="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 cancel-btn">
                            ${cancelText}
                        </button>
                        <button class="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 confirm-btn">
                            ${confirmText}
                        </button>
                    </div>
                </div>
            `;

            const confirmBtn = overlay.querySelector('.confirm-btn');
            const cancelBtn = overlay.querySelector('.cancel-btn');

            confirmBtn.addEventListener('click', () => {
                overlay.remove();
                resolve(true);
            });

            cancelBtn.addEventListener('click', () => {
                overlay.remove();
                resolve(false);
            });

            document.body.appendChild(overlay);
        });
    }
}

// 全局 ConfirmDialog 实例
const confirmDialog = new ConfirmDialog();

/**
 * 模态框组件
 */
class Modal {
    constructor() {
        this.overlay = null;
        this.content = null;
    }

    show(content, options = {}) {
        const {
            title = '',
            size = 'md',
            closable = true,
            onClose = null
        } = options;

        if (this.overlay) {
            this.hide();
        }

        const sizes = {
            sm: 'max-w-sm',
            md: 'max-w-md',
            lg: 'max-w-lg',
            xl: 'max-w-xl',
            '2xl': 'max-w-2xl',
            full: 'max-w-full'
        };

        this.overlay = document.createElement('div');
        this.overlay.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
        this.overlay.innerHTML = `
            <div class="bg-slate-800 rounded-lg ${sizes[size]} w-full max-h-[90vh] overflow-y-auto">
                ${title || closable ? `
                    <div class="flex items-center justify-between p-4 border-b border-slate-700">
                        ${title ? `<h3 class="text-xl font-semibold text-white">${title}</h3>` : '<div></div>'}
                        ${closable ? `
                            <button class="text-slate-400 hover:text-white close-btn">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
                <div class="modal-content p-4">
                    ${content}
                </div>
            </div>
        `;

        if (closable) {
            const closeBtn = this.overlay.querySelector('.close-btn');
            closeBtn.addEventListener('click', () => {
                this.hide();
                if (onClose) onClose();
            });

            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.hide();
                    if (onClose) onClose();
                }
            });
        }

        this.content = this.overlay.querySelector('.modal-content');
        document.body.appendChild(this.overlay);

        return this;
    }

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
            this.content = null;
        }
    }

    updateContent(html) {
        if (this.content) {
            this.content.innerHTML = html;
        }
    }
}

// 全局 Modal 实例
const modal = new Modal();

/**
 * 工具函数
 */
const Utils = {
    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 节流函数
     */
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 格式化日期
     */
    formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
        if (!date) return '';
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    },

    /**
     * 格式化数字
     */
    formatNumber(num, decimals = 2) {
        if (num === null || num === undefined) return '0.00';
        return parseFloat(num).toFixed(decimals);
    },

    /**
     * 复制到剪贴板
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('已复制到剪贴板');
            return true;
        } catch (err) {
            toast.error('复制失败');
            return false;
        }
    }
};

// 导出到全局
window.Toast = Toast;
window.toast = toast;
window.LoadingSpinner = LoadingSpinner;
window.loadingSpinner = loadingSpinner;
window.ConfirmDialog = ConfirmDialog;
window.confirmDialog = confirmDialog;
window.Modal = Modal;
window.modal = modal;
window.Utils = Utils;

