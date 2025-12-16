/**
 * DOM 工具函数库
 * 
 * 提供简洁的 DOM 操作接口，减少重复代码。
 * 替代原生 DOM API，提供更简洁的 API。
 */

// ========== 元素选择 ==========

/**
 * 根据 ID 获取元素
 * 
 * @param {string} id - 元素 ID
 * @returns {HTMLElement|null} DOM 元素
 */
function $id(id) {
    return document.getElementById(id);
}

/**
 * 根据选择器获取单个元素
 * 
 * @param {string} selector - CSS 选择器
 * @param {HTMLElement} context - 上下文元素（可选）
 * @returns {HTMLElement|null} DOM 元素
 */
function $(selector, context = document) {
    return context.querySelector(selector);
}

/**
 * 根据选择器获取所有元素
 * 
 * @param {string} selector - CSS 选择器
 * @param {HTMLElement} context - 上下文元素（可选）
 * @returns {Array<HTMLElement>} DOM 元素数组
 */
function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

// ========== 类操作 ==========

/**
 * 添加 CSS 类
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} className - CSS 类名
 */
function addClass(element, className) {
    if (element) element.classList.add(className);
}

/**
 * 移除 CSS 类
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} className - CSS 类名
 */
function removeClass(element, className) {
    if (element) element.classList.remove(className);
}

/**
 * 切换 CSS 类
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} className - CSS 类名
 * @returns {boolean} 操作后类是否存在
 */
function toggleClass(element, className) {
    if (element) return element.classList.toggle(className);
    return false;
}

/**
 * 检查元素是否有指定 CSS 类
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} className - CSS 类名
 * @returns {boolean} 是否包含该类
 */
function hasClass(element, className) {
    return element ? element.classList.contains(className) : false;
}

/**
 * 替换 CSS 类
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} oldClass - 旧类名
 * @param {string} newClass - 新类名
 */
function replaceClass(element, oldClass, newClass) {
    if (element) {
        element.classList.remove(oldClass);
        element.classList.add(newClass);
    }
}

// ========== 内容操作 ==========

/**
 * 设置元素文本内容
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} text - 文本内容
 */
function setText(element, text) {
    if (element) element.textContent = text;
}

/**
 * 获取元素文本内容
 * 
 * @param {HTMLElement} element - DOM 元素
 * @returns {string} 文本内容
 */
function getText(element) {
    return element ? element.textContent : '';
}

/**
 * 设置元素 HTML 内容
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} html - HTML 内容
 */
function setHTML(element, html) {
    if (element) element.innerHTML = html;
}

/**
 * 获取元素 HTML 内容
 * 
 * @param {HTMLElement} element - DOM 元素
 * @returns {string} HTML 内容
 */
function getHTML(element) {
    return element ? element.innerHTML : '';
}

// ========== 属性操作 ==========

/**
 * 设置元素属性
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} name - 属性名
 * @param {string} value - 属性值
 */
function setAttr(element, name, value) {
    if (element) element.setAttribute(name, value);
}

/**
 * 获取元素属性
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} name - 属性名
 * @returns {string|null} 属性值
 */
function getAttr(element, name) {
    return element ? element.getAttribute(name) : null;
}

/**
 * 移除元素属性
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} name - 属性名
 */
function removeAttr(element, name) {
    if (element) element.removeAttribute(name);
}

/**
 * 检查元素是否有指定属性
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} name - 属性名
 * @returns {boolean} 是否有该属性
 */
function hasAttr(element, name) {
    return element ? element.hasAttribute(name) : false;
}

// ========== 事件绑定 ==========

/**
 * 绑定事件监听器
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} event - 事件类型
 * @param {Function} handler - 事件处理函数
 * @param {Object|boolean} options - 事件选项（可选）
 */
function on(element, event, handler, options = false) {
    if (element) element.addEventListener(event, handler, options);
}

/**
 * 移除事件监听器
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} event - 事件类型
 * @param {Function} handler - 事件处理函数
 */
function off(element, event, handler) {
    if (element) element.removeEventListener(event, handler);
}

/**
 * 绑定一次性事件监听器
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} event - 事件类型
 * @param {Function} handler - 事件处理函数
 */
function once(element, event, handler) {
    if (element) {
        const wrappedHandler = function(e) {
            handler(e);
            element.removeEventListener(event, wrappedHandler);
        };
        element.addEventListener(event, wrappedHandler);
    }
}

// ========== 样式操作 ==========

/**
 * 设置元素样式
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string|Object} prop - 样式属性名或样式对象
 * @param {string} value - 样式值（当 prop 为字符串时）
 */
function setStyle(element, prop, value) {
    if (!element) return;
    
    if (typeof prop === 'object') {
        // 批量设置样式
        Object.assign(element.style, prop);
    } else {
        // 设置单个样式
        element.style[prop] = value;
    }
}

/**
 * 获取元素样式
 * 
 * @param {HTMLElement} element - DOM 元素
 * @param {string} prop - 样式属性名
 * @returns {string} 样式值
 */
function getStyle(element, prop) {
    if (!element) return '';
    return window.getComputedStyle(element)[prop];
}

// ========== 显示/隐藏 ==========

/**
 * 显示元素
 * 
 * @param {HTMLElement} element - DOM 元素
 */
function show(element) {
    if (element) {
        removeClass(element, 'hidden');
        setStyle(element, 'display', '');
    }
}

/**
 * 隐藏元素
 * 
 * @param {HTMLElement} element - DOM 元素
 */
function hide(element) {
    if (element) {
        addClass(element, 'hidden');
    }
}

/**
 * 切换元素显示/隐藏
 * 
 * @param {HTMLElement} element - DOM 元素
 * @returns {boolean} 操作后是否显示
 */
function toggle(element) {
    if (!element) return false;
    const isHidden = hasClass(element, 'hidden');
    if (isHidden) {
        show(element);
        return true;
    } else {
        hide(element);
        return false;
    }
}

// ========== 导出到全局 ==========

window.$id = $id;
window.$ = $;
window.$$ = $$;
window.addClass = addClass;
window.removeClass = removeClass;
window.toggleClass = toggleClass;
window.hasClass = hasClass;
window.replaceClass = replaceClass;
window.setText = setText;
window.getText = getText;
window.setHTML = setHTML;
window.getHTML = getHTML;
window.setAttr = setAttr;
window.getAttr = getAttr;
window.removeAttr = removeAttr;
window.hasAttr = hasAttr;
window.on = on;
window.off = off;
window.once = once;
window.setStyle = setStyle;
window.getStyle = getStyle;
window.show = show;
window.hide = hide;
window.toggle = toggle;

