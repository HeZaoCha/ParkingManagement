/**
 * 通用表单验证工具
 * 
 * 提供实时验证、错误提示、防抖等功能
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.1.0
 */

(function() {
    'use strict';

    // 验证规则配置
    const VALIDATION_RULES = {
        // 用户名：3-20个字符
        username: {
            pattern: /^.{3,20}$/,
            message: '用户名长度必须在3-20个字符之间',
            validate: function(value) {
                const trimmed = value.trim();
                if (!trimmed) return { valid: false, message: '请输入用户名' };
                if (trimmed.length < 3) return { valid: false, message: '用户名至少需要3个字符' };
                if (trimmed.length > 20) return { valid: false, message: '用户名不能超过20个字符' };
                return { valid: true, message: '' };
            }
        },
        
        // 邮箱格式
        email: {
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: '请输入有效的邮箱地址',
            validate: function(value) {
                const trimmed = value.trim();
                if (!trimmed) return { valid: false, message: '请输入邮箱地址' };
                if (!this.pattern.test(trimmed)) return { valid: false, message: this.message };
                return { valid: true, message: '' };
            }
        },
        
        // 手机号（中国）
        phone: {
            pattern: /^1[3-9]\d{9}$/,
            message: '请输入有效的手机号码（11位数字，以1开头）',
            validate: function(value) {
                const trimmed = value.trim();
                if (!trimmed) return { valid: false, message: '请输入手机号码' };
                if (!/^\d+$/.test(trimmed)) return { valid: false, message: '手机号只能包含数字' };
                if (!this.pattern.test(trimmed)) return { valid: false, message: this.message };
                return { valid: true, message: '' };
            }
        },
        
        // 密码：8-128个字符
        password: {
            pattern: /^.{8,128}$/,
            message: '密码长度必须在8-128个字符之间',
            validate: function(value) {
                if (!value) return { valid: false, message: '请输入密码' };
                if (value.length < 8) return { valid: false, message: '密码至少需要8个字符' };
                if (value.length > 128) return { valid: false, message: '密码不能超过128个字符' };
                return { valid: true, message: '' };
            }
        },
        
        // 验证码：6位数字
        verification_code: {
            pattern: /^\d{6}$/,
            message: '验证码必须是6位数字',
            validate: function(value) {
                const trimmed = value.trim();
                if (!trimmed) return { valid: false, message: '请输入验证码' };
                if (!this.pattern.test(trimmed)) return { valid: false, message: this.message };
                return { valid: true, message: '' };
            }
        },
        
        // 车牌号（使用车牌输入组件验证）
        license_plate: {
            validate: function(value) {
                const trimmed = value.trim().toUpperCase();
                if (!trimmed) return { valid: false, message: '请输入车牌号' };
                // 车牌号验证由车牌输入组件处理
                return { valid: true, message: '' };
            }
        },
        
        // 正整数
        positive_integer: {
            validate: function(value) {
                const num = parseInt(value);
                if (!value || isNaN(num) || num <= 0) {
                    return { valid: false, message: '请输入有效的正整数' };
                }
                return { valid: true, message: '' };
            }
        },
        
        // 非负数（包括0）
        non_negative: {
            validate: function(value) {
                const num = parseFloat(value);
                if (value === '' || isNaN(num) || num < 0) {
                    return { valid: false, message: '请输入有效的非负数' };
                }
                return { valid: true, message: '' };
            }
        },
        
        // 文本长度限制
        text_length: {
            validate: function(value, maxLength) {
                const trimmed = value.trim();
                if (!trimmed) return { valid: false, message: '请输入内容' };
                if (maxLength && trimmed.length > maxLength) {
                    return { valid: false, message: `内容长度不能超过${maxLength}个字符` };
                }
                return { valid: true, message: '' };
            }
        },
        
        // 必填项
        required: {
            validate: function(value) {
                const trimmed = typeof value === 'string' ? value.trim() : value;
                if (!trimmed && trimmed !== 0) {
                    return { valid: false, message: '此字段为必填项' };
                }
                return { valid: true, message: '' };
            }
        }
    };

    // 防抖函数
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 显示验证错误
    function showError(input, message) {
        const errorId = input.getAttribute('aria-describedby')?.split(' ').find(id => id.includes('error')) || 
                       input.id + '-error';
        let errorElement = document.getElementById(errorId);
        
        if (!errorElement) {
            // 创建错误提示元素
            errorElement = document.createElement('div');
            errorElement.id = errorId;
            errorElement.className = 'text-xs text-red-500 mt-1 hidden';
            errorElement.setAttribute('role', 'alert');
            errorElement.setAttribute('aria-live', 'polite');
            input.parentNode.appendChild(errorElement);
            
            // 更新 aria-describedby
            const describedBy = input.getAttribute('aria-describedby') || '';
            input.setAttribute('aria-describedby', (describedBy + ' ' + errorId).trim());
        }
        
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        input.setAttribute('aria-invalid', 'true');
        input.classList.add('border-red-500');
        input.classList.remove('border-green-500', 'border-slate-700');
        
        // 移除验证成功图标
        const successIcon = input.parentNode.querySelector('.validation-success-icon');
        if (successIcon) successIcon.classList.add('hidden');
        
        // 显示验证失败图标
        let failIcon = input.parentNode.querySelector('.validation-fail-icon');
        if (!failIcon) {
            failIcon = document.createElement('i');
            failIcon.className = 'fas fa-times-circle text-red-500 validation-fail-icon absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none';
            failIcon.setAttribute('aria-hidden', 'true');
            if (input.parentNode.classList.contains('relative')) {
                input.parentNode.appendChild(failIcon);
            }
        }
        failIcon.classList.remove('hidden');
    }

    // 显示验证成功
    function showSuccess(input) {
        const errorId = input.getAttribute('aria-describedby')?.split(' ').find(id => id.includes('error')) || 
                       input.id + '-error';
        const errorElement = document.getElementById(errorId);
        
        if (errorElement) {
            errorElement.classList.add('hidden');
            errorElement.textContent = '';
        }
        
        input.setAttribute('aria-invalid', 'false');
        input.classList.remove('border-red-500');
        input.classList.add('border-green-500');
        
        // 移除验证失败图标
        const failIcon = input.parentNode.querySelector('.validation-fail-icon');
        if (failIcon) failIcon.classList.add('hidden');
        
        // 显示验证成功图标
        let successIcon = input.parentNode.querySelector('.validation-success-icon');
        if (!successIcon) {
            successIcon = document.createElement('i');
            successIcon.className = 'fas fa-check-circle text-green-500 validation-success-icon absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none';
            successIcon.setAttribute('aria-hidden', 'true');
            if (input.parentNode.classList.contains('relative')) {
                input.parentNode.appendChild(successIcon);
            }
        }
        successIcon.classList.remove('hidden');
    }

    // 清除验证状态
    function clearValidation(input) {
        const errorId = input.getAttribute('aria-describedby')?.split(' ').find(id => id.includes('error')) || 
                       input.id + '-error';
        const errorElement = document.getElementById(errorId);
        
        if (errorElement) {
            errorElement.classList.add('hidden');
            errorElement.textContent = '';
        }
        
        input.setAttribute('aria-invalid', 'false');
        input.classList.remove('border-red-500', 'border-green-500');
        input.classList.add('border-slate-700');
        
        const successIcon = input.parentNode.querySelector('.validation-success-icon');
        const failIcon = input.parentNode.querySelector('.validation-fail-icon');
        if (successIcon) successIcon.classList.add('hidden');
        if (failIcon) failIcon.classList.add('hidden');
    }

    // 验证单个输入框
    function validateInput(input) {
        const validationType = input.dataset.validation || input.getAttribute('data-validation');
        const validationRule = input.dataset.validationRule;
        const isRequired = input.hasAttribute('required') || input.dataset.required === 'true';
        const value = input.value;
        
        // 如果为空且不是必填项，清除验证状态
        if (!value && !isRequired) {
            clearValidation(input);
            return { valid: true, message: '' };
        }
        
        // 如果为空但是必填项
        if (!value && isRequired) {
            showError(input, '此字段为必填项');
            return { valid: false, message: '此字段为必填项' };
        }
        
        // 根据验证类型进行验证
        let rule;
        if (validationType && VALIDATION_RULES[validationType]) {
            rule = VALIDATION_RULES[validationType];
        } else if (validationRule && VALIDATION_RULES[validationRule]) {
            rule = VALIDATION_RULES[validationRule];
        } else {
            // 默认验证：如果必填，检查是否为空
            if (isRequired && !value.trim()) {
                showError(input, '此字段为必填项');
                return { valid: false, message: '此字段为必填项' };
            }
            clearValidation(input);
            return { valid: true, message: '' };
        }
        
        // 执行验证
        const result = rule.validate(value, input.dataset.maxLength);
        
        if (result.valid) {
            showSuccess(input);
        } else {
            showError(input, result.message);
        }
        
        return result;
    }

    // 初始化表单验证
    function initFormValidation(form) {
        if (!form) return;
        
        // 查找所有需要验证的输入框
        const inputs = form.querySelectorAll('input[data-validation], input[required], textarea[data-validation], textarea[required], select[data-validation], select[required]');
        
        inputs.forEach(input => {
            // 确保父容器是 relative（用于定位验证图标）
            if (!input.parentNode.classList.contains('relative')) {
                input.parentNode.classList.add('relative');
            }
            
            // 输入时验证（防抖）
            const debouncedValidate = debounce(() => {
                validateInput(input);
            }, 300);
            
            input.addEventListener('input', debouncedValidate);
            
            // 失焦时立即验证
            input.addEventListener('blur', () => {
                validateInput(input);
            });
            
            // 清除时清除验证状态
            input.addEventListener('focus', () => {
                // 聚焦时不自动清除，保持当前状态
            });
        });
        
        // 表单提交时验证所有字段
        form.addEventListener('submit', function(e) {
            let isValid = true;
            const firstInvalidInput = [];
            
            inputs.forEach(input => {
                const result = validateInput(input);
                if (!result.valid) {
                    isValid = false;
                    if (firstInvalidInput.length === 0) {
                        firstInvalidInput.push(input);
                    }
                }
            });
            
            if (!isValid && firstInvalidInput.length > 0) {
                e.preventDefault();
                firstInvalidInput[0].focus();
                return false;
            }
        });
    }

    // 导出到全局
    window.FormValidation = {
        init: initFormValidation,
        validate: validateInput,
        rules: VALIDATION_RULES,
        showError: showError,
        showSuccess: showSuccess,
        clearValidation: clearValidation
    };

    // 自动初始化所有表单
    document.addEventListener('DOMContentLoaded', function() {
        const forms = document.querySelectorAll('form[data-validate], form[novalidate]');
        forms.forEach(form => {
            initFormValidation(form);
        });
    });
})();

