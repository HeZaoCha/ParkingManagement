/**
 * 公共工具函数库
 * 
 * 提供项目中通用的 JavaScript 工具函数，包括：
 * - CSRF Token 获取
 * - API 请求封装
 * - 表单验证
 * - 模态框管理
 * - 消息提示
 */

// ========== CSRF Token 管理 ==========

/**
 * 获取 CSRF Token
 * 按优先级从以下位置获取：
 * 1. meta[name="csrf-token"] 标签
 * 2. 表单的 csrfmiddlewaretoken 字段
 * 3. Cookie 中的 csrftoken
 * 
 * @returns {string} CSRF Token
 */
function getCsrfToken() {
    // 从 meta 标签获取
    const metaToken = document.querySelector('meta[name="csrf-token"]');
    if (metaToken) return metaToken.getAttribute('content');
    
    // 从表单的 csrfmiddlewaretoken 字段获取
    const formToken = document.querySelector('[name=csrfmiddlewaretoken]');
    if (formToken) return formToken.value;
    
    // 从 cookie 获取
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') return value;
    }
    
    return '';
}

// ========== API 请求封装 ==========

/**
 * 通用 API 请求函数
 * 
 * @param {string} url - 请求 URL
 * @param {Object} options - 请求选项
 * @param {string} options.method - HTTP 方法，默认 'GET'
 * @param {Object} options.data - 请求数据（POST/PUT/PATCH）
 * @param {Object} options.headers - 额外的请求头
 * @param {boolean} options.showLoading - 是否显示加载状态，默认 false
 * @param {boolean} options.showToast - 是否显示 Toast 提示，默认 false
 * @returns {Promise<Object>} 响应数据
 */
async function apiRequest(url, options = {}) {
    const {
        method = 'GET',
        data = null,
        headers = {},
        showLoading = false,
        showToast = false
    } = options;
    
    // 显示加载状态
    if (showLoading && typeof window.showLoading === 'function') {
        window.showLoading();
    }
    
    try {
        const requestOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
                ...headers
            }
        };
        
        if (data && method !== 'GET') {
            requestOptions.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, requestOptions);
        const result = await response.json();
        
        // 显示 Toast 提示
        if (showToast && typeof window.showToast === 'function') {
            if (result.success) {
                window.showToast(result.message || '操作成功', 'success');
            } else {
                window.showToast(result.message || '操作失败', 'error');
            }
        }
        
        return result;
        
    } catch (error) {
        console.error('API Error:', error);
        
        if (showToast && typeof window.showToast === 'function') {
            window.showToast('请求失败，请稍后重试', 'error');
        }
        
        return { success: false, message: '网络错误，请稍后重试' };
        
    } finally {
        // 隐藏加载状态
        if (showLoading && typeof window.hideLoading === 'function') {
            window.hideLoading();
        }
    }
}

// ========== 表单验证 ==========

/**
 * 验证邮箱格式
 * 
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 验证车牌号格式
 * 
 * @param {string} plate - 车牌号
 * @returns {boolean} 是否有效
 */
function validateLicensePlate(plate) {
    const plateRegex = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/;
    return plateRegex.test(plate.toUpperCase());
}

/**
 * 验证文本长度
 * 
 * @param {string} text - 文本内容
 * @param {number} min - 最小长度
 * @param {number} max - 最大长度
 * @returns {Object} {valid: boolean, message: string}
 */
function validateTextLength(text, min = 0, max = Infinity) {
    const length = text.trim().length;
    
    if (length < min) {
        return { valid: false, message: `长度不能少于 ${min} 个字符` };
    }
    
    if (length > max) {
        return { valid: false, message: `长度不能超过 ${max} 个字符` };
    }
    
    return { valid: true };
}

/**
 * 显示字段错误
 * 
 * @param {string} fieldName - 字段名称
 * @param {string} message - 错误消息
 */
function showFieldError(fieldName, message) {
    const errorEl = document.getElementById(`${fieldName}-error`);
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    }
    
    const inputEl = document.getElementById(fieldName);
    if (inputEl) {
        inputEl.classList.add('border-red-500');
    }
}

/**
 * 清除字段错误
 * 
 * @param {string} fieldName - 字段名称
 */
function clearFieldError(fieldName) {
    const errorEl = document.getElementById(`${fieldName}-error`);
    if (errorEl) {
        errorEl.classList.add('hidden');
    }
    
    const inputEl = document.getElementById(fieldName);
    if (inputEl) {
        inputEl.classList.remove('border-red-500');
    }
}

// ========== 模态框管理 ==========

let modalPreviousActiveElement = null;
const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * 打开模态框（带焦点管理）
 * 
 * @param {string} modalId - 模态框 ID
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // 保存当前焦点元素
    modalPreviousActiveElement = document.activeElement;
    
    // 显示模态框
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // 添加动画类
    const backdrop = modal;
    const content = modal.querySelector('.card-theme, .modal-content');
    if (backdrop) backdrop.classList.add('backdrop-enter');
    if (content) content.classList.add('modal-enter');
    
    // 延迟聚焦到第一个可聚焦元素
    setTimeout(() => {
        const firstFocusable = modal.querySelector(focusableElements);
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }, 100);
    
    // Tab键循环焦点（限制在模态框内）
    const handleTabKey = (e) => {
        if (e.key !== 'Tab') return;
        
        const focusable = Array.from(modal.querySelectorAll(focusableElements))
            .filter(el => !el.disabled && el.offsetParent !== null);
        
        if (focusable.length === 0) return;
        
        const firstFocusable = focusable[0];
        const lastFocusable = focusable[focusable.length - 1];
        
        if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
                e.preventDefault();
                lastFocusable.focus();
            }
        } else {
            if (document.activeElement === lastFocusable) {
                e.preventDefault();
                firstFocusable.focus();
            }
        }
    };
    
    modal.addEventListener('keydown', handleTabKey);
    modal._handleTabKey = handleTabKey;
}

/**
 * 关闭模态框（恢复焦点）
 * 
 * @param {string} modalId - 模态框 ID
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // 移除动画类，添加退出动画
    const backdrop = modal;
    const content = modal.querySelector('.card-theme, .modal-content');
    if (backdrop) {
        backdrop.classList.remove('backdrop-enter');
        backdrop.classList.add('backdrop-exit');
    }
    if (content) {
        content.classList.remove('modal-enter');
        content.classList.add('modal-exit');
    }
    
    // 移除Tab键处理
    if (modal._handleTabKey) {
        modal.removeEventListener('keydown', modal._handleTabKey);
        delete modal._handleTabKey;
    }
    
    // 延迟隐藏，等待动画完成
    setTimeout(() => {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
        
        // 恢复之前的焦点
        if (modalPreviousActiveElement && modalPreviousActiveElement.focus) {
            modalPreviousActiveElement.focus();
        }
        modalPreviousActiveElement = null;
    }, 200);
}

// ESC键关闭模态框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal:not(.hidden), [role="dialog"]:not(.hidden)');
        openModals.forEach(modal => {
            const modalId = modal.id;
            if (modalId) closeModal(modalId);
        });
    }
});

// 点击背景关闭模态框
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal') || e.target.getAttribute('role') === 'dialog') {
        closeModal(e.target.id);
    }
});

// ========== Toast 通知系统 ==========

/**
 * 确保 Toast 容器存在
 * @returns {HTMLElement} Toast 容器元素
 */
function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-50 space-y-2';
        document.body.appendChild(container);
    }
    return container;
}

/**
 * 显示 Toast 通知
 * 
 * @param {string} message - 消息内容
 * @param {string} type - 类型：'success', 'error', 'warning', 'info'
 * @param {number} duration - 显示时长（毫秒），默认 4000
 */
function showToast(message, type = 'info', duration = 4000) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const colors = {
        success: 'bg-emerald-600',
        error: 'bg-red-600',
        warning: 'bg-amber-600',
        info: 'bg-blue-600'
    };
    
    toast.className = `toast-enter flex items-center gap-3 px-4 py-3 ${colors[type]} text-white rounded-lg shadow-lg min-w-[280px]`;
    toast.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span class="flex-1">${message}</span>
        <button onclick="window.removeToast(this.parentElement)" class="opacity-70 hover:opacity-100">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    setTimeout(() => removeToast(toast), duration);
}

/**
 * 移除 Toast 通知
 * 
 * @param {HTMLElement} toast - Toast 元素
 */
function removeToast(toast) {
    if (!toast) return;
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
}

// ========== 加载状态管理 ==========

/**
 * 确保加载遮罩存在
 * @returns {HTMLElement} 加载遮罩元素
 */
function ensureLoadingOverlay() {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-slate-900/80 dark:bg-black/80 flex items-center justify-center z-50 hidden';
        overlay.innerHTML = `
            <div class="flex flex-col items-center gap-4">
                <div class="w-12 h-12 loading-spinner rounded-full border-4 border-slate-300 dark:border-slate-600 border-t-primary-500"></div>
                <p class="text-slate-300 dark:text-slate-400">处理中...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    return overlay;
}

/**
 * 显示加载状态
 */
function showLoading() {
    const overlay = ensureLoadingOverlay();
    overlay.classList.remove('hidden');
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// ========== 确认对话框 ==========

let confirmCallback = null;
let confirmPreviousActiveElement = null;

/**
 * 确保确认对话框存在
 * @returns {HTMLElement} 确认对话框元素
 */
function ensureConfirmModal() {
    let modal = document.getElementById('confirm-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'modal fixed inset-0 bg-black/50 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.innerHTML = `
            <div class="modal-content bg-slate-800 dark:bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div class="p-6">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center" aria-hidden="true">
                            <i class="fas fa-exclamation-triangle text-amber-400 text-xl"></i>
                        </div>
                        <div>
                            <h3 id="confirm-title" class="text-lg font-semibold text-white">确认操作</h3>
                            <p id="confirm-message" class="text-slate-400 text-sm">您确定要执行此操作吗？</p>
                        </div>
                    </div>
                </div>
                <div class="flex border-t border-slate-700" role="group" aria-label="确认操作">
                    <button type="button" id="confirm-cancel-btn" 
                            class="flex-1 px-6 py-3 text-slate-300 hover:bg-slate-700/50 transition-colors"
                            aria-label="取消操作">
                        取消
                    </button>
                    <button type="button" id="confirm-btn" 
                            class="flex-1 px-6 py-3 bg-red-600 text-white hover:bg-red-700 transition-colors"
                            aria-label="确认执行操作">
                        确认
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // 绑定事件
        document.getElementById('confirm-btn').addEventListener('click', function() {
            if (confirmCallback) {
                confirmCallback();
            }
            closeConfirmModal();
        });
        
        document.getElementById('confirm-cancel-btn').addEventListener('click', closeConfirmModal);
        
        modal.addEventListener('click', function(e) {
            if (e.target.id === 'confirm-modal') {
                closeConfirmModal();
            }
        });
    }
    return modal;
}

/**
 * 显示确认对话框
 * 
 * @param {string} title - 标题
 * @param {string} message - 消息内容
 * @param {Function} callback - 确认回调函数
 */
function showConfirm(title, message, callback) {
    const modal = ensureConfirmModal();
    
    // 保存当前焦点元素
    confirmPreviousActiveElement = document.activeElement;
    
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    confirmCallback = callback;
    
    // 聚焦到确认按钮
    setTimeout(() => {
        const confirmBtn = document.getElementById('confirm-btn');
        if (confirmBtn) confirmBtn.focus();
    }, 100);
}

/**
 * 关闭确认对话框
 */
function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    if (!modal) return;
    
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    confirmCallback = null;
    
    // 恢复焦点
    if (confirmPreviousActiveElement && confirmPreviousActiveElement.focus) {
        confirmPreviousActiveElement.focus();
    }
    confirmPreviousActiveElement = null;
}

// ESC键关闭确认对话框
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const confirmModal = document.getElementById('confirm-modal');
        if (confirmModal && !confirmModal.classList.contains('hidden')) {
            closeConfirmModal();
        }
    }
});

// ========== 消息提示（兼容旧接口） ==========

/**
 * 显示成功消息
 * 
 * @param {string} title - 标题
 * @param {string} message - 消息内容
 */
function showSuccess(title, message) {
    const modal = document.getElementById('success-modal');
    if (modal) {
        const titleEl = modal.querySelector('#success-title, [data-success-title]');
        const messageEl = modal.querySelector('#success-message, [data-success-message]');
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        openModal('success-modal');
    } else {
        showToast(message || title, 'success');
    }
}

/**
 * 显示错误消息
 * 
 * @param {string} title - 标题
 * @param {string} message - 消息内容
 */
function showError(title, message) {
    const modal = document.getElementById('error-modal');
    if (modal) {
        const titleEl = modal.querySelector('#error-title, [data-error-title]');
        const messageEl = modal.querySelector('#error-message, [data-error-message]');
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        openModal('error-modal');
    } else {
        showToast(message || title, 'error');
    }
}

// ========== 数据工具 ==========

/**
 * 从 data 属性获取 JSON 数据
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} attribute - data 属性名（不含 data- 前缀）
 * @param {*} defaultValue - 默认值
 * @returns {*} 解析后的数据
 */
function getDataAttribute(element, attribute, defaultValue = null) {
    if (!element) return defaultValue;
    
    const value = element.dataset[attribute];
    if (!value) return defaultValue;
    
    try {
        return JSON.parse(value);
    } catch (e) {
        return value;
    }
}

/**
 * 数字动画（从当前值到目标值）
 * 
 * @param {HTMLElement} element - 目标元素
 * @param {number} targetValue - 目标值
 * @param {boolean} isCurrency - 是否为货币格式
 * @param {number} duration - 动画时长（毫秒）
 */
function animateNumberToElement(element, targetValue, isCurrency = false, duration = 500) {
    if (!element) return;
    
    const currentText = element.textContent.replace(/[^0-9.]/g, '');
    const currentValue = parseFloat(currentText) || 0;
    const increment = targetValue > currentValue ? 1 : -1;
    const steps = Math.abs(targetValue - currentValue);
    const stepTime = steps > 0 ? duration / steps : 0;
    
    let current = currentValue;
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= targetValue) || (increment < 0 && current <= targetValue)) {
            current = targetValue;
            clearInterval(timer);
        }
        if (isCurrency) {
            element.textContent = '¥' + Math.floor(current).toLocaleString();
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, stepTime);
}

// ========== 导出到全局 ==========

// 导出到 window 对象，供其他脚本使用
window.getCsrfToken = getCsrfToken;
window.apiRequest = apiRequest;
window.validateEmail = validateEmail;
window.validateLicensePlate = validateLicensePlate;
window.validateTextLength = validateTextLength;
window.showFieldError = showFieldError;
window.clearFieldError = clearFieldError;
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;
window.removeToast = removeToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showConfirm = showConfirm;
window.closeConfirmModal = closeConfirmModal;
window.showSuccess = showSuccess;
window.showError = showError;
window.getDataAttribute = getDataAttribute;
window.animateNumberToElement = animateNumberToElement;

