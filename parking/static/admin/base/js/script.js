// 更新时间
        function updateTime() {
            const now = new Date();
            const timeStr = now.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            document.getElementById('current-time').textContent = timeStr;
        }
        updateTime();
        setInterval(updateTime, 1000);
        
        // 使用公共工具库中的 Toast、Loading、Confirm 功能
        // showToast, removeToast, showLoading, hideLoading, showConfirm, closeConfirmModal 已在 utils.js 中定义
        
        // 管理后台特定的 apiRequest（包装公共工具库的 apiRequest，添加加载状态）
        async function apiRequest(url, options = {}) {
            window.showLoading();
            
            try {
                const result = await window.apiRequest(url, {
                    ...options,
                    showLoading: false, // 已手动调用 showLoading
                    showToast: true // 使用公共工具库的 showToast
                });
                return result;
            } finally {
                window.hideLoading();
            }
        }
        
        // 删除操作（使用公共工具库的 showConfirm）
        function deleteItem(url, itemName) {
            window.showConfirm('确认删除', `您确定要删除 "${itemName}" 吗？此操作无法撤销。`, async () => {
                const result = await apiRequest(url, { method: 'POST' });
                if (result.success) {
                    setTimeout(() => location.reload(), 500);
                }
            });
        }
        
        // ESC 关闭模态框（扩展公共工具库的功能，添加侧边栏关闭）
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                // 移动端时关闭侧边栏
                if (window.innerWidth < 1024) {
                    const sidebar = document.getElementById('admin-sidebar');
                    if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
                        toggleSidebar();
                    }
                }
            }
        });
        
        // 侧边栏切换（移动端）
        function toggleSidebar() {
            const sidebar = document.getElementById('admin-sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            const toggleBtn = document.getElementById('sidebar-toggle-btn');
            
            if (!sidebar || !overlay || !toggleBtn) return;
            
            const isOpen = !sidebar.classList.contains('-translate-x-full');
            
            if (isOpen) {
                // 关闭侧边栏
                sidebar.classList.add('-translate-x-full');
                overlay.classList.add('hidden');
                toggleBtn.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            } else {
                // 打开侧边栏
                sidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('hidden');
                toggleBtn.setAttribute('aria-expanded', 'true');
                document.body.style.overflow = 'hidden';
            }
        }
        
        // 窗口大小改变时，如果切换到桌面端，自动显示侧边栏
        let resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                const sidebar = document.getElementById('admin-sidebar');
                const overlay = document.getElementById('sidebar-overlay');
                const toggleBtn = document.getElementById('sidebar-toggle-btn');
                
                if (window.innerWidth >= 1024) {
                    // 桌面端：显示侧边栏，隐藏遮罩
                    if (sidebar) sidebar.classList.remove('-translate-x-full');
                    if (overlay) overlay.classList.add('hidden');
                    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                } else {
                    // 移动端：默认隐藏侧边栏
                    if (sidebar) sidebar.classList.add('-translate-x-full');
                    if (overlay) overlay.classList.add('hidden');
                    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
                }
            }, 100);
        });
        
        // 点击侧边栏链接时，移动端自动关闭侧边栏
        document.addEventListener('DOMContentLoaded', function() {
            const sidebarLinks = document.querySelectorAll('#admin-sidebar a[href]');
            sidebarLinks.forEach(link => {
                link.addEventListener('click', function() {
                    if (window.innerWidth < 1024) {
                        setTimeout(toggleSidebar, 100);
                    }
                });
            });
        });