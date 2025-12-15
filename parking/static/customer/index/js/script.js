
// 使用公共工具库中的 getCsrfToken
const csrfToken = window.getCsrfToken();
  
  // 刷新停车场状态
  async function refreshStatus() {
    try {
      const response = await fetch('/parking/api/stats/', {
        headers: { 'X-CSRFToken': csrfToken }
      });
      const result = await response.json();
      
      if (result.success) {
        document.getElementById('available-count').textContent = result.data.available_spaces;
        document.getElementById('occupied-count').textContent = result.data.occupied_spaces;
        document.getElementById('total-count').textContent = result.data.total_spaces;
        
        if (result.data.parking_lots.length > 0) {
          const rate = result.data.parking_lots[0].hourly_rate;
          document.getElementById('hourly-rate').textContent = `¥${rate}/小时`;
        }
      }
    } catch (error) {
      console.error('获取状态失败:', error);
    }
  }
  
  // 查询车辆
  async function queryVehicle() {
    const plate = document.getElementById('query-plate').value.toUpperCase().trim();
    if (!plate) {
      showResult('error', '请输入车牌号');
      return;
    }
    
    const btn = document.getElementById('query-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>查询中...';
    
    try {
      const response = await fetch(`/parking/api/query/?license_plate=${encodeURIComponent(plate)}`, {
        headers: { 'X-CSRFToken': csrfToken }
      });
      const result = await response.json();
      
      if (result.success && result.data.found) {
        showQueryResult(result.data);
      } else {
        showResult('not_found', plate);
      }
    } catch (error) {
      showResult('error', '查询失败，请稍后重试');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-search mr-2"></i>查询停车状态';
    }
  }
  
  // 显示查询结果
  function showQueryResult(data) {
    const resultDiv = document.getElementById('query-result');
    
    if (data.is_parked) {
      // 在场
      const isVip = data.is_vip || false;
      const vipBadge = isVip ? '<span class="ml-2 px-2 py-1 bg-amber-100 text-amber-600 text-xs rounded-full">员工/VIP</span>' : '';
      const feeText = isVip ? '<span class="text-emerald-600">免费</span>' : `¥${data.current_fee}`;
      
      resultDiv.innerHTML = `
        <div class="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200">
          <div class="flex items-center justify-between mb-4">
            <span class="text-emerald-600 font-medium flex items-center">
              <i class="fas fa-car mr-2"></i>车辆在场${vipBadge}
            </span>
            <span class="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">
              <i class="fas fa-circle text-emerald-500 mr-1 animate-pulse" style="font-size: 6px;"></i>停车中
            </span>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-theme-secondary">车牌号</span>
              <span class="font-mono font-bold text-theme-primary">${data.license_plate}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-theme-secondary">停车场</span>
              <span class="text-theme-primary">${data.parking_lot}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-theme-secondary">车位号</span>
              <span class="text-theme-primary">${data.space_number}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-theme-secondary">入场时间</span>
              <span class="text-theme-primary">${data.entry_time}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-theme-secondary">停车时长</span>
              <span class="text-theme-primary">${formatDuration(data.duration_minutes)}</span>
            </div>
            <div class="border-t border-emerald-200 pt-3 flex justify-between items-center">
              <span class="text-theme-secondary font-medium">当前费用</span>
              <span class="text-2xl font-bold ${isVip ? 'text-emerald-600' : 'text-amber-500'}">${feeText}</span>
            </div>
          </div>
        </div>
      `;
    } else {
      // 不在场
      resultDiv.innerHTML = `
        <div class="p-4 bg-theme-secondary rounded-2xl border-2 border-theme">
          <div class="flex items-center justify-between mb-4">
            <span class="text-theme-secondary font-medium flex items-center">
              <i class="fas fa-car mr-2"></i>车辆信息
            </span>
            <span class="text-xs bg-theme-tertiary text-theme-secondary px-2 py-1 rounded-full">不在场内</span>
          </div>
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-theme-secondary">车牌号</span>
              <span class="font-mono font-bold text-theme-primary">${data.license_plate}</span>
            </div>
            ${data.last_visit ? `
              <div class="flex justify-between">
                <span class="text-theme-secondary">上次离场</span>
                <span class="text-theme-primary">${data.last_visit}</span>
              </div>
            ` : ''}
            ${data.last_lot ? `
              <div class="flex justify-between">
                <span class="text-theme-secondary">上次停车</span>
                <span class="text-theme-primary">${data.last_lot}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }
    
    resultDiv.classList.remove('hidden');
  }
  
  // 结果模态框焦点管理
  let resultModalPreviousActiveElement = null;
  
  function openResultModal() {
    // 保存当前焦点
    resultModalPreviousActiveElement = document.activeElement;
    
    const modal = document.getElementById('result-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // 聚焦到模态框内容
    setTimeout(() => {
      const content = document.getElementById('result-content');
      if (content) {
        content.setAttribute('tabindex', '-1');
        content.focus();
      }
    }, 100);
  }
  
  function closeResultModal() {
    const modal = document.getElementById('result-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    
    // 恢复焦点
    if (resultModalPreviousActiveElement && resultModalPreviousActiveElement.focus) {
      resultModalPreviousActiveElement.focus();
    }
    resultModalPreviousActiveElement = null;
  }
  
  // ESC键关闭模态框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('result-modal');
      if (modal && !modal.classList.contains('hidden')) {
        closeResultModal();
      }
    }
  });
  
  // 点击背景关闭模态框
  document.getElementById('result-modal').addEventListener('click', (e) => {
    if (e.target.id === 'result-modal') {
      closeResultModal();
    }
  });
  
  // 显示提示结果
  function showResult(type, message) {
    const resultDiv = document.getElementById('query-result');
    
    if (type === 'not_found') {
      resultDiv.innerHTML = `
        <div class="p-6 bg-theme-secondary rounded-2xl text-center">
          <div class="w-16 h-16 bg-theme-tertiary rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
            <i class="fas fa-car text-3xl text-theme-muted"></i>
          </div>
          <p class="text-theme-secondary font-medium">未找到车辆 ${message}</p>
          <p class="text-sm text-theme-muted mt-2">该车辆可能尚未入场或车牌号输入有误</p>
        </div>
      `;
    } else if (type === 'error') {
      resultDiv.innerHTML = `
        <div class="p-6 bg-red-50 rounded-2xl text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
            <i class="fas fa-exclamation-triangle text-3xl text-red-400"></i>
          </div>
          <p class="text-red-600 font-medium">${message}</p>
        </div>
      `;
    }
    
    resultDiv.classList.remove('hidden');
  }
  
  // 格式化时长
  function formatDuration(minutes) {
    if (!minutes) return '刚入场';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}小时${mins}分钟`;
    }
    return `${mins}分钟`;
  }
  
  // 输入框回车查询
  document.getElementById('query-plate').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') queryVehicle();
  });
  
  // 自动大写
  document.getElementById('query-plate').addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
  });
  
  // 初始化
  document.addEventListener('DOMContentLoaded', () => {
    refreshStatus();
    // 每30秒刷新一次状态
    setInterval(refreshStatus, 30000);
  });