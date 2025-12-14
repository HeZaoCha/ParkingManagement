/**
 * UI组件库扩展
 * 
 * 卡片、按钮、输入框等基础UI组件
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 卡片组件
     */
    class Card {
        constructor(options = {}) {
            this.title = options.title || '';
            this.content = options.content || '';
            this.footer = options.footer || '';
            this.className = options.className || '';
            this.onClick = options.onClick || null;
        }

        render() {
            const card = document.createElement('div');
            card.className = `card ${this.className}`;
            
            if (this.onClick) {
                card.style.cursor = 'pointer';
                card.addEventListener('click', this.onClick);
            }

            let html = '';
            if (this.title) {
                html += `<div class="card-header"><h3 class="card-title">${this.title}</h3></div>`;
            }
            html += `<div class="card-body">${this.content}</div>`;
            if (this.footer) {
                html += `<div class="card-footer">${this.footer}</div>`;
            }

            card.innerHTML = html;
            return card;
        }

        static create(options) {
            const card = new Card(options);
            return card.render();
        }
    }

    /**
     * 按钮组件
     */
    class Button {
        constructor(options = {}) {
            this.text = options.text || '按钮';
            this.type = options.type || 'button'; // button, submit, reset
            this.variant = options.variant || 'primary'; // primary, secondary, success, danger, warning, info
            this.size = options.size || 'md'; // sm, md, lg
            this.icon = options.icon || '';
            this.loading = options.loading || false;
            this.disabled = options.disabled || false;
            this.onClick = options.onClick || null;
            this.className = options.className || '';
        }

        render() {
            const button = document.createElement('button');
            button.type = this.type;
            button.className = `btn btn-${this.variant} btn-${this.size} ${this.className}`;
            button.disabled = this.disabled || this.loading;

            let html = '';
            if (this.loading) {
                html += '<i class="fas fa-spinner fa-spin mr-2"></i>';
            } else if (this.icon) {
                html += `<i class="${this.icon} mr-2"></i>`;
            }
            html += this.text;
            button.innerHTML = html;

            if (this.onClick) {
                button.addEventListener('click', (e) => {
                    if (!this.disabled && !this.loading) {
                        this.onClick(e);
                    }
                });
            }

            return button;
        }

        setLoading(loading) {
            this.loading = loading;
            const spinner = this.element?.querySelector('.fa-spinner');
            if (spinner) {
                spinner.style.display = loading ? 'inline-block' : 'none';
            }
            if (this.element) {
                this.element.disabled = loading || this.disabled;
            }
        }

        setDisabled(disabled) {
            this.disabled = disabled;
            if (this.element) {
                this.element.disabled = disabled || this.loading;
            }
        }

        static create(options) {
            const button = new Button(options);
            button.element = button.render();
            return button;
        }
    }

    /**
     * 输入框组件
     */
    class Input {
        constructor(options = {}) {
            this.type = options.type || 'text';
            this.name = options.name || '';
            this.value = options.value || '';
            this.placeholder = options.placeholder || '';
            this.label = options.label || '';
            this.required = options.required || false;
            this.disabled = options.disabled || false;
            this.readonly = options.readonly || false;
            this.error = options.error || '';
            this.helpText = options.helpText || '';
            this.icon = options.icon || '';
            this.onChange = options.onChange || null;
            this.onBlur = options.onBlur || null;
            this.className = options.className || '';
        }

        render() {
            const container = document.createElement('div');
            container.className = `input-group ${this.className}`;

            let html = '';
            if (this.label) {
                html += `<label for="${this.name}" class="input-label">${this.label}${this.required ? ' <span class="text-red-500">*</span>' : ''}</label>`;
            }

            html += '<div class="input-wrapper">';
            if (this.icon) {
                html += `<i class="${this.icon} input-icon"></i>`;
            }
            html += `<input 
                type="${this.type}" 
                id="${this.name}" 
                name="${this.name}" 
                value="${this.value}" 
                placeholder="${this.placeholder}"
                class="input-field ${this.error ? 'input-error' : ''} ${this.icon ? 'input-with-icon' : ''}"
                ${this.required ? 'required' : ''}
                ${this.disabled ? 'disabled' : ''}
                ${this.readonly ? 'readonly' : ''}
            >`;
            html += '</div>';

            if (this.error) {
                html += `<div class="input-error-message">${this.error}</div>`;
            }
            if (this.helpText) {
                html += `<div class="input-help-text">${this.helpText}</div>`;
            }

            container.innerHTML = html;

            const input = container.querySelector('input');
            if (this.onChange) {
                input.addEventListener('input', (e) => {
                    this.value = e.target.value;
                    this.onChange(e);
                });
            }
            if (this.onBlur) {
                input.addEventListener('blur', this.onBlur);
            }

            this.element = input;
            this.container = container;
            return container;
        }

        getValue() {
            return this.element?.value || '';
        }

        setValue(value) {
            if (this.element) {
                this.element.value = value;
                this.value = value;
            }
        }

        setError(error) {
            this.error = error;
            if (this.container) {
                const errorMsg = this.container.querySelector('.input-error-message');
                const input = this.container.querySelector('input');
                if (error) {
                    if (errorMsg) {
                        errorMsg.textContent = error;
                        errorMsg.style.display = 'block';
                    } else {
                        const div = document.createElement('div');
                        div.className = 'input-error-message';
                        div.textContent = error;
                        this.container.appendChild(div);
                    }
                    input?.classList.add('input-error');
                } else {
                    if (errorMsg) {
                        errorMsg.style.display = 'none';
                    }
                    input?.classList.remove('input-error');
                }
            }
        }

        static create(options) {
            const input = new Input(options);
            return input.render();
        }
    }

    /**
     * 进度条组件
     */
    class ProgressBar {
        constructor(options = {}) {
            this.value = options.value || 0; // 0-100
            this.max = options.max || 100;
            this.showLabel = options.showLabel !== false;
            this.variant = options.variant || 'primary'; // primary, success, warning, danger
            this.animated = options.animated !== false;
            this.striped = options.striped || false;
            this.className = options.className || '';
        }

        render() {
            const container = document.createElement('div');
            container.className = `progress ${this.className}`;

            const progressBar = document.createElement('div');
            progressBar.className = `progress-bar progress-bar-${this.variant} ${this.animated ? 'progress-animated' : ''} ${this.striped ? 'progress-striped' : ''}`;
            progressBar.style.width = `${(this.value / this.max) * 100}%`;
            progressBar.setAttribute('role', 'progressbar');
            progressBar.setAttribute('aria-valuenow', this.value);
            progressBar.setAttribute('aria-valuemin', 0);
            progressBar.setAttribute('aria-valuemax', this.max);

            if (this.showLabel) {
                progressBar.textContent = `${Math.round((this.value / this.max) * 100)}%`;
            }

            container.appendChild(progressBar);
            this.element = progressBar;
            this.container = container;
            return container;
        }

        setValue(value) {
            this.value = Math.max(0, Math.min(this.max, value));
            if (this.element) {
                this.element.style.width = `${(this.value / this.max) * 100}%`;
                this.element.setAttribute('aria-valuenow', this.value);
                if (this.showLabel) {
                    this.element.textContent = `${Math.round((this.value / this.max) * 100)}%`;
                }
            }
        }

        static create(options) {
            const progress = new ProgressBar(options);
            return progress.render();
        }
    }

    // 导出到全局
    window.UIComponents = {
        Card,
        Button,
        Input,
        ProgressBar
    };
})();

