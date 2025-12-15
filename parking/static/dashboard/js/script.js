// 更新时间和问候语
  function updateTimeAndGreeting() {
    const now = new Date();
    const hour = now.getHours();
    
    // 更新时间
    document.getElementById('current-time').textContent = now.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // 更新日期
    document.getElementById('current-date').textContent = now.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
    
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
    
    document.getElementById('greeting-text').textContent = greeting;
    document.getElementById('greeting-icon').className = `fas ${icon} mr-2`;
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
  
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', updateDashboardData);
  }
  
  // 初始化
  document.addEventListener('DOMContentLoaded', () => {
    updateTimeAndGreeting();
    setInterval(updateTimeAndGreeting, 1000);
    
    // 延迟执行数字动画
    setTimeout(animateCountUp, 300);
    
    // 初始化进度条
    setTimeout(initProgressBars, 500);
    
    // 隐藏加载动画
    const loader = document.getElementById('page-loader');
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
      }, 500);
    }
  });
  
  // ESC关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
      });
    }
  });