/**
 * 移动端优化脚本
 * 
 * 移动端布局、触摸手势、表单输入优化
 * 
 * Author: HeZaoCha
 * Created: 2025-12-14
 * Version: 1.0.0
 */

(function() {
    'use strict';

    /**
     * 移动端优化管理器
     */
    class MobileOptimizer {
        constructor() {
            this.isMobile = this.detectMobile();
            this.init();
        }

        /**
         * 检测移动设备
         */
        detectMobile() {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   window.innerWidth <= 768;
        }

        /**
         * 初始化
         */
        init() {
            if (!this.isMobile) return;

            // 优化表单输入
            this.optimizeFormInputs();

            // 优化触摸手势
            this.optimizeTouchGestures();

            // 创建移动端菜单
            this.createMobileMenu();

            // 优化滚动
            this.optimizeScrolling();

            // 防止双击缩放
            this.preventDoubleTapZoom();
        }

        /**
         * 优化表单输入
         */
        optimizeFormInputs() {
            // 为所有输入框添加移动端优化类
            const inputs = document.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                // 设置字体大小，防止iOS自动缩放
                if (input.type !== 'hidden') {
                    input.style.fontSize = '16px';
                }

                // 优化数字输入
                if (input.type === 'number') {
                    input.setAttribute('inputmode', 'numeric');
                }

                // 优化邮箱输入
                if (input.type === 'email') {
                    input.setAttribute('autocapitalize', 'off');
                    input.setAttribute('autocorrect', 'off');
                }
            });
        }

        /**
         * 优化触摸手势
         */
        optimizeTouchGestures() {
            // 为可点击元素添加触摸反馈
            const clickableElements = document.querySelectorAll('button, a, .clickable, [role="button"]');
            
            clickableElements.forEach(element => {
                element.addEventListener('touchstart', function() {
                    this.style.opacity = '0.7';
                }, { passive: true });

                element.addEventListener('touchend', function() {
                    setTimeout(() => {
                        this.style.opacity = '';
                    }, 150);
                }, { passive: true });
            });
        }

        /**
         * 创建移动端菜单
         */
        createMobileMenu() {
            // 检查是否已有移动端菜单按钮
            if (document.getElementById('mobile-menu-toggle')) {
                return;
            }

            // 查找主导航
            const mainNav = document.querySelector('nav, .navbar, .sidebar, [role="navigation"]');
            if (!mainNav) return;

            // 创建移动端菜单按钮
            const menuToggle = document.createElement('button');
            menuToggle.id = 'mobile-menu-toggle';
            menuToggle.className = 'md:hidden fixed top-4 left-4 z-50 w-12 h-12 bg-white dark:bg-slate-800 rounded-lg shadow-lg flex items-center justify-center';
            menuToggle.setAttribute('aria-label', '打开菜单');
            menuToggle.innerHTML = '<i class="fas fa-bars text-slate-700 dark:text-slate-200"></i>';
            
            // 创建移动端菜单
            const mobileMenu = document.createElement('div');
            mobileMenu.id = 'mobile-menu';
            mobileMenu.className = 'mobile-menu';
            
            const menuContent = document.createElement('div');
            menuContent.className = 'mobile-menu-content bg-white dark:bg-slate-800 p-4';
            menuContent.innerHTML = `
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-lg font-semibold text-slate-900 dark:text-white">菜单</h2>
                    <button onclick="window.MobileOptimizer.closeMobileMenu()" 
                            class="text-slate-500 dark:text-slate-400">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <nav class="space-y-2">
                    ${this.generateMenuItems(mainNav)}
                </nav>
            `;
            
            mobileMenu.appendChild(menuContent);
            document.body.appendChild(mobileMenu);
            document.body.appendChild(menuToggle);

            // 绑定事件
            menuToggle.addEventListener('click', () => {
                this.openMobileMenu();
            });

            // 点击外部关闭
            mobileMenu.addEventListener('click', (e) => {
                if (e.target === mobileMenu) {
                    this.closeMobileMenu();
                }
            });
        }

        /**
         * 生成菜单项
         */
        generateMenuItems(nav) {
            const links = nav.querySelectorAll('a, [role="link"]');
            return Array.from(links).map(link => {
                const text = link.textContent.trim();
                const href = link.href || link.getAttribute('href') || '#';
                return `
                    <a href="${href}" 
                       class="block px-4 py-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">
                        ${text}
                    </a>
                `;
            }).join('');
        }

        /**
         * 打开移动端菜单
         */
        openMobileMenu() {
            const menu = document.getElementById('mobile-menu');
            if (menu) {
                menu.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        }

        /**
         * 关闭移动端菜单
         */
        closeMobileMenu() {
            const menu = document.getElementById('mobile-menu');
            if (menu) {
                menu.classList.remove('active');
                document.body.style.overflow = '';
            }
        }

        /**
         * 优化滚动
         */
        optimizeScrolling() {
            // 启用平滑滚动
            document.documentElement.style.scrollBehavior = 'smooth';

            // 优化长列表滚动性能
            const longLists = document.querySelectorAll('ul, ol, .list');
            longLists.forEach(list => {
                if (list.children.length > 20) {
                    list.style.willChange = 'scroll-position';
                }
            });
        }

        /**
         * 防止双击缩放
         */
        preventDoubleTapZoom() {
            let lastTouchEnd = 0;
            document.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - lastTouchEnd <= 300) {
                    e.preventDefault();
                }
                lastTouchEnd = now;
            }, { passive: false });
        }
    }

    // 创建全局移动端优化器
    window.MobileOptimizer = new MobileOptimizer();
})();

