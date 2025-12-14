/**
 * 表单自动保存草稿和恢复功能
 * 
 * 自动保存表单数据到localStorage，刷新后自动恢复
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    const DRAFT_PREFIX = 'form_draft_';
    const AUTO_SAVE_INTERVAL = 2000; // 2秒自动保存一次

    /**
     * 表单自动保存管理器
     */
    class FormAutoSave {
        constructor(form) {
            this.form = form;
            this.formId = form.id || form.name || this.generateFormId();
            this.draftKey = DRAFT_PREFIX + this.formId;
            this.saveTimer = null;
            this.init();
        }

        /**
         * 生成表单ID
         */
        generateFormId() {
            const action = this.form.action || window.location.pathname;
            return btoa(action).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
        }

        /**
         * 初始化
         */
        init() {
            // 恢复草稿
            this.restoreDraft();

            // 监听表单输入
            this.form.addEventListener('input', () => {
                this.scheduleSave();
            });

            // 表单提交成功后清除草稿
            this.form.addEventListener('submit', () => {
                this.clearDraft();
            });

            // 页面卸载前保存
            window.addEventListener('beforeunload', () => {
                this.saveDraft();
            });

            // 显示草稿提示
            this.showDraftIndicator();
        }

        /**
         * 安排保存（防抖）
         */
        scheduleSave() {
            if (this.saveTimer) {
                clearTimeout(this.saveTimer);
            }
            this.saveTimer = setTimeout(() => {
                this.saveDraft();
            }, AUTO_SAVE_INTERVAL);
        }

        /**
         * 保存草稿
         */
        saveDraft() {
            const formData = this.serializeForm();
            if (Object.keys(formData).length > 0) {
                try {
                    localStorage.setItem(this.draftKey, JSON.stringify({
                        data: formData,
                        timestamp: Date.now()
                    }));
                    this.updateDraftIndicator(true);
                } catch (error) {
                    console.warn('保存草稿失败:', error);
                }
            }
        }

        /**
         * 恢复草稿
         */
        restoreDraft() {
            try {
                const draft = localStorage.getItem(this.draftKey);
                if (draft) {
                    const { data, timestamp } = JSON.parse(draft);
                    // 草稿有效期24小时
                    if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                        this.fillForm(data);
                        this.showRestoreNotification();
                        return true;
                    } else {
                        // 过期草稿，删除
                        this.clearDraft();
                    }
                }
            } catch (error) {
                console.warn('恢复草稿失败:', error);
            }
            return false;
        }

        /**
         * 序列化表单
         */
        serializeForm() {
            const formData = {};
            const inputs = this.form.querySelectorAll('input, textarea, select');
            
            inputs.forEach(input => {
                // 跳过提交按钮、隐藏字段（type="hidden"）、文件输入
                if (input.type === 'submit' || input.type === 'button' || 
                    input.type === 'hidden' || input.type === 'file' ||
                    input.type === 'password') {
                    return;
                }

                const name = input.name || input.id;
                if (name) {
                    if (input.type === 'checkbox') {
                        formData[name] = input.checked;
                    } else if (input.type === 'radio') {
                        if (input.checked) {
                            formData[name] = input.value;
                        }
                    } else {
                        formData[name] = input.value;
                    }
                }
            });

            return formData;
        }

        /**
         * 填充表单
         */
        fillForm(data) {
            Object.keys(data).forEach(name => {
                const input = this.form.querySelector(`[name="${name}"], #${name}`);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = data[name];
                    } else if (input.type === 'radio') {
                        const radio = this.form.querySelector(`[name="${name}"][value="${data[name]}"]`);
                        if (radio) {
                            radio.checked = true;
                        }
                    } else {
                        input.value = data[name];
                        // 触发input事件，触发验证
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });
        }

        /**
         * 清除草稿
         */
        clearDraft() {
            try {
                localStorage.removeItem(this.draftKey);
                this.updateDraftIndicator(false);
            } catch (error) {
                console.warn('清除草稿失败:', error);
            }
        }

        /**
         * 显示草稿指示器
         */
        showDraftIndicator() {
            const hasDraft = localStorage.getItem(this.draftKey) !== null;
            this.updateDraftIndicator(hasDraft);
        }

        /**
         * 更新草稿指示器
         */
        updateDraftIndicator(hasDraft) {
            let indicator = document.getElementById('draft-indicator-' + this.formId);
            
            if (hasDraft) {
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.id = 'draft-indicator-' + this.formId;
                    indicator.className = 'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2';
                    indicator.innerHTML = `
                        <i class="fas fa-save"></i>
                        <span>草稿已保存</span>
                        <button onclick="window.FormAutoSaveManager.clearDraft('${this.formId}')" 
                                class="ml-2 text-white hover:text-blue-200">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    document.body.appendChild(indicator);
                }
                indicator.style.display = 'flex';
            } else {
                if (indicator) {
                    indicator.style.display = 'none';
                }
            }
        }

        /**
         * 显示恢复通知
         */
        showRestoreNotification() {
            if (window.toast) {
                window.toast.info('已恢复草稿，您可以继续编辑', 3000);
            }
        }
    }

    /**
     * 表单自动保存管理器（全局）
     */
    class FormAutoSaveManager {
        constructor() {
            this.forms = new Map();
        }

        /**
         * 初始化表单
         */
        initForm(form) {
            if (form.dataset.autosave !== 'false') {
                const formId = form.id || form.name || this.generateFormId(form);
                if (!this.forms.has(formId)) {
                    this.forms.set(formId, new FormAutoSave(form));
                }
            }
        }

        /**
         * 生成表单ID
         */
        generateFormId(form) {
            const action = form.action || window.location.pathname;
            return btoa(action).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
        }

        /**
         * 清除草稿
         */
        clearDraft(formId) {
            const form = this.forms.get(formId);
            if (form) {
                form.clearDraft();
            } else {
                try {
                    localStorage.removeItem(DRAFT_PREFIX + formId);
                } catch (error) {
                    console.warn('清除草稿失败:', error);
                }
            }
        }

        /**
         * 清除所有草稿
         */
        clearAllDrafts() {
            try {
                const keys = Object.keys(localStorage);
                keys.forEach(key => {
                    if (key.startsWith(DRAFT_PREFIX)) {
                        localStorage.removeItem(key);
                    }
                });
            } catch (error) {
                console.warn('清除所有草稿失败:', error);
            }
        }
    }

    // 创建全局管理器
    window.FormAutoSaveManager = new FormAutoSaveManager();

    // 自动初始化所有表单
    document.addEventListener('DOMContentLoaded', function() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            window.FormAutoSaveManager.initForm(form);
        });
    });
})();

