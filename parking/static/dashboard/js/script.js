// 更新时间和问候语
function updateTimeAndGreeting() {
  const now = new Date();
  const hour = now.getHours();
  
  // 更新时间
  const currentTimeEl = document.getElementById('current-time');
  if (currentTimeEl) {
    // 使用更可靠的时间格式化方法
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;
    currentTimeEl.textContent = timeString;
  } else {
    // 如果元素不存在，尝试延迟执行
    console.warn('current-time element not found, retrying...');
  }
  
  // 更新日期
  const currentDateEl = document.getElementById('current-date');
  if (currentDateEl) {
    currentDateEl.textContent = now.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }
  
  // 更新问候语
  let greeting, icon;
  if (hour < 6) {
    greeting = '夜深了';
    icon = 'fa-moon';
  } else if (hour < 12) {
    greeting = '早上好';
    icon = 'fa-sun';
  } else if (hour < 14) {
    greeting = '中午好';
    icon = 'fa-cloud-sun';
  } else if (hour < 18) {
    greeting = '下午好';
    icon = 'fa-cloud-sun';
  } else {
    greeting = '晚上好';
    icon = 'fa-moon';
  }
  
  const greetingTextEl = document.getElementById('greeting-text');
  if (greetingTextEl) {
    greetingTextEl.textContent = greeting;
  }
  
  const greetingIconEl = document.getElementById('greeting-icon');
  if (greetingIconEl) {
    greetingIconEl.className = `fas ${icon} mr-2`;
  }
}
  
// 数字滚动动画
function animateCountUp() {
    const elements = document.querySelectorAll('.count-up');
    elements.forEach(el => {
      const target = parseInt(el.dataset.count) || 0;
      const duration = 1000;
      const start = 0;
      const startTime = performance.now();
      
      function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(start + (target - start) * easeOut);
        
        el.textContent = current.toLocaleString();
        
        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          el.textContent = target.toLocaleString();
        }
      }
      
      requestAnimationFrame(update);
    });
  }
  
// 快捷操作函数
function openQuickEntry() {
    document.getElementById('entry-modal').classList.remove('hidden');
    document.getElementById('entry-plate').focus();
  }
  
function openQuickExit() {
    document.getElementById('exit-modal').classList.remove('hidden');
    document.getElementById('exit-plate').focus();
  }
  
function openQuickSearch() {
    document.getElementById('search-modal').classList.remove('hidden');
    document.getElementById('search-plate').focus();
  }
  
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  }
  
function showLotDetail(lotId) {
    {% if user.is_staff %}
    window.location.href = `/manage/lots/${lotId}/`;
    {% else %}
    alert('请联系管理员查看详情');
    {% endif %}
  }
  
// 初始化进度条
function initProgressBars() {
    document.querySelectorAll('.lot-progress').forEach(bar => {
      const occupied = parseInt(bar.dataset.occupied) || 0;
      const total = parseInt(bar.dataset.total) || 1;
      const percentage = Math.round((occupied / total) * 100);
      bar.style.width = percentage + '%';
    });
  }
  
// 刷新按钮动画和更新函数
function updateDashboardData() {
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      const icon = refreshBtn.querySelector('i');
      if (icon) {
        icon.classList.add('fa-spin');
      }
    }
    
    // 调用quick_modals中的更新函数
    if (window.updateDashboardDataFromModal) {
      window.updateDashboardDataFromModal().then(() => {
        if (refreshBtn && icon) {
          setTimeout(() => icon.classList.remove('fa-spin'), 1000);
        }
      });
    } else {
      // 如果quick_modals未加载，直接刷新页面
      location.reload();
    }
  }
  
// 全局更新函数（供其他模块调用）
window.updateDashboardData = updateDashboardData;

// 实时更新活动动态
function startActivityFeedAutoRefresh() {
    // 立即更新一次相对时间
    if (window.updateRelativeTimes) {
      window.updateRelativeTimes();
    }

    // 每30秒自动刷新活动动态
    setInterval(() => {
      if (window.updateDashboardDataFromModal) {
        window.updateDashboardDataFromModal();
      }
    }, 30000); // 30秒
  }

// 初始化函数（只执行一次）
let dashboardInitialized = false;

function initDashboard() {
  // 防止重复初始化
  if (dashboardInitialized) {
    return;
  }
  
  // 检查关键元素是否存在，如果不存在则延迟重试
  const currentTimeEl = document.getElementById('current-time');
  if (!currentTimeEl) {
    // 如果元素不存在，延迟 100ms 后重试（最多重试 10 次）
    let retryCount = 0;
    const maxRetries = 10;
    const retryInterval = setInterval(() => {
      retryCount++;
      const el = document.getElementById('current-time');
      if (el) {
        clearInterval(retryInterval);
        // 元素找到了，标记为已初始化并继续执行
        dashboardInitialized = true;
        continueInit();
      } else if (retryCount >= maxRetries) {
        clearInterval(retryInterval);
        console.error('current-time element not found after retries');
        dashboardInitialized = true; // 标记为已初始化，避免无限重试
      }
    }, 100);
    return;
  }
  
  // 标记为已初始化
  dashboardInitialized = true;
  continueInit();
}

// 继续初始化（实际执行初始化的函数）
function continueInit() {
  // 立即更新一次时间和问候语
  updateTimeAndGreeting();
  // 每秒更新一次时间
  setInterval(updateTimeAndGreeting, 1000);
  
  // 绑定刷新按钮事件
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', updateDashboardData);
  }
  
  // 延迟执行数字动画
  setTimeout(animateCountUp, 300);
  
  // 初始化进度条
  setTimeout(initProgressBars, 500);
  
  // 初始化相对时间显示
  if (window.updateRelativeTimes) {
    window.updateRelativeTimes();
  }
  
  // 启动活动动态自动刷新
  startActivityFeedAutoRefresh();
  
  // 隐藏加载动画
  const loader = document.getElementById('page-loader');
  if (loader) {
    setTimeout(() => {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 300);
    }, 500);
  }
}

// 确保在 DOM 加载完成后执行初始化
// 如果 DOM 已经加载完成，直接执行；否则等待 DOMContentLoaded 事件
if (document.readyState === 'loading') {
  // DOM 还在加载中，等待 DOMContentLoaded 事件
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  // DOM 已经加载完成，直接执行
  // 使用 setTimeout 确保在下一个事件循环中执行，给 DOM 更多时间渲染
  setTimeout(initDashboard, 0);
}

// ESC关闭模态框
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal').forEach(modal => {
      modal.classList.add('hidden');
    });
  }
});