// 使用公共工具库中的函数
// getCsrfToken, apiRequest, showSuccess, showError, openModal, closeModal 已在 utils.js 中定义
  
  // 车牌号实时验证
  let plateValidateTimer = null;
  document.getElementById('entry-plate').addEventListener('input', function(e) {
    const plate = e.target.value.toUpperCase();
    e.target.value = plate;
    
    clearTimeout(plateValidateTimer);
    
    const statusEl = document.getElementById('entry-plate-status');
    const errorEl = document.getElementById('entry-plate-error');
    
    if (plate.length >= 7) {
      plateValidateTimer = setTimeout(async () => {
        const result = await window.apiRequest(`/parking/api/validate-plate/?license_plate=${encodeURIComponent(plate)}`);
        
        if (result.success) {
          statusEl.innerHTML = '<i class="fas fa-check-circle text-emerald-500"></i>';
          statusEl.classList.remove('hidden');
          errorEl.classList.add('hidden');
        } else {
          statusEl.innerHTML = '<i class="fas fa-times-circle text-red-500"></i>';
          statusEl.classList.remove('hidden');
          errorEl.textContent = result.message;
          errorEl.classList.remove('hidden');
        }
      }, 300);
    } else {
      statusEl.classList.add('hidden');
      errorEl.classList.add('hidden');
    }
  });
  
  // 加载可用停车位
  async function loadAvailableSpaces(lotId) {
    const spaceField = document.getElementById('entry-space-field');
    const spaceSelect = document.getElementById('entry-space');
    
    if (!lotId) {
      spaceField.classList.add('hidden');
      spaceSelect.innerHTML = '<option value="">请选择停车位（必选）</option>';
      return;
    }
    
    // 显示加载状态
    spaceSelect.disabled = true;
    spaceSelect.innerHTML = '<option value="">加载中...</option>';
    spaceField.classList.remove('hidden');
    
    try {
      const result = await window.apiRequest(`/parking/api/available-spaces/?parking_lot_id=${lotId}`);
      
      if (result.success && result.data.spaces.length > 0) {
        spaceSelect.innerHTML = '<option value="">请选择停车位（必选）</option>';
        result.data.spaces.forEach(space => {
          const option = document.createElement('option');
          option.value = space.id;
          const typeMap = {
            'standard': '标准',
            'vip': 'VIP',
            'large': '大型',
            'disabled': '残疾人'
          };
          option.textContent = `${space.space_number} (${typeMap[space.space_type] || space.space_type})`;
          spaceSelect.appendChild(option);
        });
        spaceSelect.disabled = false;
      } else {
        spaceSelect.innerHTML = '<option value="">暂无可用停车位</option>';
        spaceSelect.disabled = true;
        window.showError('加载失败', '该停车场暂无可用停车位');
      }
    } catch (error) {
      console.error('加载停车位失败:', error);
      spaceSelect.innerHTML = '<option value="">加载失败，请重试</option>';
      spaceSelect.disabled = true;
      window.showError('加载失败', '无法加载停车位列表，请稍后重试');
    }
  }
  
  // 车辆入场表单提交
  document.getElementById('entry-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // ========== 前端验证（提交前） ==========
    
    const formData = new FormData(this);
    let plate = formData.get('license_plate');
    
    // 1. 验证车牌号（必填）
    if (!plate) {
      // 尝试从车牌网格获取
      const plateGrid = document.querySelector('[data-plate-grid-for="entry-plate"]');
      if (plateGrid) {
        const plateCells = plateGrid.querySelectorAll('.plate-cell');
        plate = Array.from(plateCells).map(cell => cell.textContent.trim()).join('');
      }
    }
    
    if (!plate || plate.trim() === '') {
      window.showError('入场失败', '请输入车牌号');
      const plateGrid = document.querySelector('[data-plate-grid-for="entry-plate"]');
      if (plateGrid) {
        const firstCell = plateGrid.querySelector('.plate-cell');
        if (firstCell) firstCell.focus();
      }
      return;
    }
    
    plate = plate.toUpperCase().trim();
    
    // 验证车牌号格式（使用公共工具库的验证函数）
    if (!window.validateLicensePlate(plate)) {
      window.showError('入场失败', '车牌号格式不正确，请输入有效的车牌号');
      const plateGrid = document.querySelector('[data-plate-grid-for="entry-plate"]');
      if (plateGrid) {
        const firstCell = plateGrid.querySelector('.plate-cell');
        if (firstCell) firstCell.focus();
      }
      return;
    }
    
    // 2. 验证停车场（必填）
    const lotId = formData.get('parking_lot');
    if (!lotId) {
      window.showError('入场失败', '请选择停车场');
      const lotSelect = document.getElementById('entry-lot');
      if (lotSelect) lotSelect.focus();
      return;
    }
    
    // 3. 验证停车位（必填）
    const spaceId = formData.get('parking_space_id');
    if (!spaceId) {
      window.showError('入场失败', '请选择停车位');
      const spaceSelect = document.getElementById('entry-space');
      if (spaceSelect) spaceSelect.focus();
      return;
    }
    
    // 4. 验证车辆类型（必填）
    const vehicleType = formData.get('vehicle_type');
    if (!vehicleType) {
      window.showError('入场失败', '请选择车辆类型');
      return;
    }
    
    // 所有验证通过，准备提交
    
    const submitBtn = document.getElementById('entry-submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>处理中...';
    
    try {
      const result = await window.apiRequest('/parking/api/entry/', {
        method: 'POST',
        data: {
          license_plate: plate,
          parking_lot_id: lotId,
          vehicle_type: vehicleType,
          parking_space_id: spaceId,
        }
      });
      
      if (result.success) {
        window.closeModal('entry-modal');
        window.showSuccess('入场登记成功', 
          `车牌 ${result.data.license_plate} 已入场\n停车场：${result.data.parking_lot}\n车位号：${result.data.space_number}`);
        
        // 更新仪表盘数据（不刷新整个页面）
        updateDashboardDataFromModal();
      } else {
        window.showError('入场失败', result.message);
      }
    } catch (error) {
      window.showError('入场失败', '网络错误，请稍后重试');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i>确认入场';
    }
  });
  
  // 更新仪表盘数据（AJAX，不刷新整个页面）
  async function updateDashboardDataFromModal() {
    try {
      const statsResult = await window.apiRequest('/parking/api/stats/');
      if (statsResult.success) {
        const data = statsResult.data;
        
        // 更新统计卡片中的数字（使用data-count属性）
        const countUpElements = document.querySelectorAll('.count-up[data-count]');
        countUpElements.forEach(el => {
          const dataCount = el.getAttribute('data-count');
          if (dataCount) {
            // 根据元素位置或父元素内容判断要更新哪个数据
            const parentText = el.closest('.stat-card')?.textContent || '';
            if (parentText.includes('总车位')) {
              el.setAttribute('data-count', data.total_spaces);
              window.animateNumberToElement(el, data.total_spaces);
            } else if (parentText.includes('已占用')) {
              el.setAttribute('data-count', data.occupied_spaces);
              window.animateNumberToElement(el, data.occupied_spaces);
            } else if (parentText.includes('空闲车位')) {
              el.setAttribute('data-count', data.available_spaces);
              window.animateNumberToElement(el, data.available_spaces);
            }
          }
        });
        
        // 更新今日统计区域
        const todayStats = document.querySelectorAll('.card-theme .font-number');
        todayStats.forEach(el => {
          const parentText = el.closest('div')?.textContent || '';
          if (parentText.includes('入场车辆')) {
            const parent = el.closest('.flex.items-center.justify-between');
            if (parent) {
              const countEl = parent.querySelector('.text-xl.font-bold');
              if (countEl) {
                window.animateNumberToElement(countEl, data.today_count);
              }
            }
          } else if (parentText.includes('在场车辆')) {
            const parent = el.closest('.flex.items-center.justify-between');
            if (parent) {
              const countEl = parent.querySelector('.text-xl.font-bold');
              if (countEl) {
                window.animateNumberToElement(countEl, data.active_count);
              }
            }
          } else if (parentText.includes('今日收入')) {
            const parent = el.closest('.flex.items-center.justify-between');
            if (parent) {
              const countEl = parent.querySelector('.text-xl.font-bold');
              if (countEl) {
                const revenue = parseFloat(data.today_revenue) || 0;
                window.animateNumberToElement(countEl, revenue, true);
              }
            }
          }
        });
        
        // 更新停车场列表（如果存在）
        if (data.parking_lots && Array.isArray(data.parking_lots)) {
          updateParkingLotsList(data.parking_lots);
        }
        
        // 更新最近记录（如果存在）
        if (data.recent_records && Array.isArray(data.recent_records)) {
          updateRecentRecords(data.recent_records);
        }
      }
    } catch (error) {
      console.error('更新仪表盘数据失败:', error);
    }
  }
  
  // 使用公共工具库中的 animateNumberToElement（已在 utils.js 中定义）
  
  // 更新停车场列表
  function updateParkingLotsList(lots) {
    // 查找停车场列表容器并更新
    const lotsSection = document.querySelector('[data-parking-lots-section]');
    if (lotsSection && lots.length > 0) {
      // 这里可以根据实际页面结构更新停车场列表
      console.log('更新停车场列表:', lots);
    }
  }
  
  // 更新最近记录（活动动态）
  function updateRecentRecords(records) {
    const activityFeed = document.getElementById('activity-feed');
    if (!activityFeed || !Array.isArray(records)) {
      return;
    }

    // 获取当前显示的记录ID集合
    const currentRecordIds = new Set(
      Array.from(activityFeed.querySelectorAll('.activity-item')).map(el => el.dataset.recordId)
    );

    // 获取新记录ID集合
    const newRecordIds = new Set(records.map(r => String(r.id)));

    // 找出需要移除的记录（已不在新数据中）
    const toRemove = Array.from(currentRecordIds).filter(id => !newRecordIds.has(id));
    toRemove.forEach(id => {
      const item = activityFeed.querySelector(`[data-record-id="${id}"]`);
      if (item) {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        setTimeout(() => item.remove(), 300);
      }
    });

    // 找出需要添加的新记录
    const toAdd = records.filter(r => !currentRecordIds.has(String(r.id)));

    // 添加新记录（带动画）
    toAdd.forEach((record, index) => {
      const item = createActivityItem(record);
      item.style.opacity = '0';
      item.style.transform = 'translateX(20px)';
      activityFeed.insertBefore(item, activityFeed.firstChild);
      
      // 延迟动画，创建连续出现效果
      setTimeout(() => {
        item.style.transition = 'all 0.3s ease-out';
        item.style.opacity = '1';
        item.style.transform = 'translateX(0)';
      }, index * 50);
    });

    // 更新现有记录的时间显示
    updateRelativeTimes();
  }

  // 创建活动动态项
  function createActivityItem(record) {
    const div = document.createElement('div');
    div.className = 'activity-item flex items-start gap-3 p-3 bg-theme-secondary rounded-xl transition-all duration-300 hover:bg-theme-secondary/80';
    div.dataset.recordId = record.id;
    div.dataset.entryTime = record.entry_time;
    if (record.exit_time) {
      div.dataset.exitTime = record.exit_time;
    }

    // 确定状态
    const isParking = !record.exit_time;
    const isUnpaid = record.exit_time && !record.is_paid;
    const isCompleted = record.exit_time && record.is_paid;

    // 图标和颜色
    let iconClass, bgClass, textClass, statusText, statusIcon;
    if (isParking) {
      iconClass = 'fa-arrow-right text-emerald-500';
      bgClass = 'bg-emerald-100 dark:bg-emerald-900/30';
      textClass = 'text-emerald-600 dark:text-emerald-400';
      statusText = '车辆入场';
      statusIcon = '<span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>';
    } else if (isUnpaid) {
      iconClass = 'fa-clock text-amber-500';
      bgClass = 'bg-amber-100 dark:bg-amber-900/30';
      textClass = 'text-amber-600 dark:text-amber-400';
      statusText = '已出场待支付';
      statusIcon = '<i class="fas fa-exclamation-circle text-xs"></i>';
    } else {
      iconClass = 'fa-check-circle text-slate-500';
      bgClass = 'bg-slate-100 dark:bg-slate-900/30';
      textClass = 'text-slate-600 dark:text-slate-400';
      statusText = '已出场并支付';
      statusIcon = '<i class="fas fa-check-circle text-xs"></i>';
    }

    const timeAttr = isParking ? record.entry_time : record.exit_time;
    const timeLabel = isParking ? 'far fa-clock' : 'fas fa-sign-out-alt';

    div.innerHTML = `
      <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${bgClass}">
        <i class="fas ${iconClass}"></i>
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <span class="font-mono font-medium text-theme-primary">${record.vehicle?.license_plate || '未知'}</span>
          <span class="text-xs px-2 py-0.5 ${bgClass} ${textClass} rounded-full flex items-center gap-1">
            ${statusIcon}
            ${statusText}
          </span>
        </div>
        <p class="text-sm text-theme-muted truncate mb-1">
          <i class="fas fa-map-marker-alt text-xs mr-1"></i>
          ${record.parking_space?.parking_lot?.name || '未知'} · ${record.parking_space?.space_number || '未知'}
        </p>
        <div class="flex items-center gap-2 text-xs text-theme-muted flex-wrap">
          <span class="flex items-center gap-1">
            <i class="${timeLabel}"></i>
            <span class="relative-time" data-time="${timeAttr}">刚刚</span>
          </span>
          ${record.fee ? `<span class="text-amber-500 font-medium"><i class="fas fa-yen-sign"></i>${record.fee}</span>` : ''}
          ${record.duration_minutes ? `<span class="text-theme-muted"><i class="far fa-hourglass-half"></i>${record.duration_minutes}分钟</span>` : ''}
        </div>
      </div>
    `;

    return div;
  }

  // 更新相对时间显示
  function updateRelativeTimes() {
    document.querySelectorAll('.relative-time').forEach(el => {
      const timeStr = el.dataset.time;
      if (!timeStr) return;

      try {
        const time = new Date(timeStr);
        const now = new Date();
        const diff = Math.floor((now - time) / 1000); // 秒

        let text;
        if (diff < 60) {
          text = '刚刚';
        } else if (diff < 3600) {
          const minutes = Math.floor(diff / 60);
          text = `${minutes}分钟前`;
        } else if (diff < 86400) {
          const hours = Math.floor(diff / 3600);
          text = `${hours}小时前`;
        } else {
          const days = Math.floor(diff / 86400);
          text = `${days}天前`;
        }

        el.textContent = text;
      } catch (e) {
        console.error('时间解析错误:', e);
      }
    });
  }

  // 定期更新相对时间（每分钟）
  setInterval(updateRelativeTimes, 60000);

  // 导出到全局，供其他模块使用
  window.updateRelativeTimes = updateRelativeTimes;
  
  // 查询出场车辆
  async function searchForExit() {
    // ========== 前端验证（提交前） ==========
    
    let plate = document.getElementById('exit-plate').value.trim();
    if (!plate) {
      window.showError('查询失败', '请输入车牌号');
      document.getElementById('exit-plate').focus();
      return;
    }
    
    plate = plate.toUpperCase();
    
    // 验证车牌号格式（使用公共工具库的验证函数）
    if (!window.validateLicensePlate(plate)) {
      window.showError('查询失败', '车牌号格式不正确，请输入有效的车牌号');
      document.getElementById('exit-plate').focus();
      return;
    }
    
    // 显示加载状态
    document.getElementById('exit-loading').classList.remove('hidden');
    document.getElementById('exit-result').classList.add('hidden');
    document.getElementById('exit-not-found').classList.add('hidden');
    
    try {
      const result = await window.apiRequest(`/parking/api/query/?license_plate=${encodeURIComponent(plate)}`);
      
      document.getElementById('exit-loading').classList.add('hidden');
      
      if (result.success && result.data.found && result.data.is_parked) {
        const data = result.data;
        
        document.getElementById('exit-result').classList.remove('hidden');
        document.getElementById('exit-result-plate').textContent = data.license_plate;
        document.getElementById('exit-result-lot').textContent = data.parking_lot;
        document.getElementById('exit-result-space').textContent = data.space_number;
        document.getElementById('exit-result-entry').textContent = data.entry_time;
        
        // 计算停车时长
        const minutes = data.duration_minutes;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        document.getElementById('exit-result-duration').textContent = 
          hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
        
        document.getElementById('exit-result-fee').textContent = `¥${data.current_fee}`;
        document.getElementById('exit-record-id').value = data.record_id;
      } else {
        document.getElementById('exit-not-found').classList.remove('hidden');
        document.getElementById('exit-error-msg').textContent = 
          result.data.is_parked === false ? '该车辆不在场内' : result.message;
      }
    } catch (error) {
      document.getElementById('exit-loading').classList.add('hidden');
      document.getElementById('exit-not-found').classList.remove('hidden');
      document.getElementById('exit-error-msg').textContent = '查询失败，请稍后重试';
    }
  }
  
  // 确认出场
  async function confirmExit() {
    // ========== 前端验证（提交前） ==========
    
    const recordId = document.getElementById('exit-record-id').value;
    if (!recordId) {
      window.showError('出场失败', '未找到有效的停车记录，请先查询车辆');
      return;
    }
    
    const plate = document.getElementById('exit-result-plate')?.textContent;
    if (!plate) {
      window.showError('出场失败', '未找到车辆信息，请先查询车辆');
      return;
    }
    
    // 所有验证通过，准备提交
    const confirmBtn = document.getElementById('exit-confirm-btn');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>处理中...';
    
    try {
      const result = await window.apiRequest('/parking/api/exit/', {
        method: 'POST',
        data: {
          record_id: recordId,
          auto_pay: true,
        }
      });
      
      if (result.success) {
        window.closeModal('exit-modal');
        window.showSuccess('出场成功', 
          `车牌 ${result.data.license_plate} 已出场\n停车费用：¥${result.data.fee}`);
        
        // 更新仪表盘数据（不刷新整个页面）
        updateDashboardDataFromModal();
      } else {
        window.showError('出场失败', result.message);
      }
    } catch (error) {
      window.showError('出场失败', '网络错误，请稍后重试');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = '<i class="fas fa-credit-card mr-2"></i>确认结算';
    }
  }
  
  // 搜索车辆
  async function searchVehicle() {
    // ========== 前端验证（提交前） ==========
    
    let plate = document.getElementById('search-plate').value.trim();
    if (!plate) {
      window.showError('查询失败', '请输入车牌号');
      document.getElementById('search-plate').focus();
      return;
    }
    
    plate = plate.toUpperCase();
    
    // 验证车牌号格式（使用公共工具库的验证函数）
    if (!window.validateLicensePlate(plate)) {
      window.showError('查询失败', '车牌号格式不正确，请输入有效的车牌号');
      document.getElementById('search-plate').focus();
      return;
    }
    
    const resultsDiv = document.getElementById('search-results');
    const loadingDiv = document.getElementById('search-loading');
    
    loadingDiv.classList.remove('hidden');
    resultsDiv.innerHTML = '';
    
    try {
      const result = await window.apiRequest(`/parking/api/query/?license_plate=${encodeURIComponent(plate)}`);
      
      loadingDiv.classList.add('hidden');
      
      if (result.success && result.data.found) {
        const data = result.data;
        
        let statusHtml, statusText;
        if (data.is_parked) {
          statusHtml = `
            <span class="ml-auto px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-full">
              停车中
            </span>`;
          statusText = `
            <p><i class="fas fa-parking mr-2 text-theme-muted"></i>${data.parking_lot} · ${data.space_number}</p>
            <p><i class="far fa-clock mr-2 text-theme-muted"></i>入场时间：${data.entry_time}</p>
            <p><i class="fas fa-coins mr-2 text-theme-muted"></i>当前费用：<span class="text-amber-500">¥${data.current_fee}</span></p>`;
        } else {
          statusHtml = `
            <span class="ml-auto px-2 py-1 bg-slate-100 dark:bg-slate-900/30 text-slate-600 dark:text-slate-400 text-xs rounded-full">
              不在场内
            </span>`;
          statusText = data.last_visit ? 
            `<p><i class="far fa-clock mr-2 text-theme-muted"></i>上次离场：${data.last_visit}</p>
             <p><i class="fas fa-parking mr-2 text-theme-muted"></i>上次停车：${data.last_lot || '未知'}</p>` :
            `<p class="text-theme-muted">暂无停车记录</p>`;
        }
        
        resultsDiv.innerHTML = `
          <div class="p-4 bg-theme-secondary rounded-xl">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <i class="fas fa-car text-blue-500"></i>
              </div>
              <div>
                <p class="font-mono font-bold text-theme-primary">${data.license_plate}</p>
                <p class="text-sm text-theme-muted">${data.vehicle_type || '小型车'}</p>
              </div>
              ${statusHtml}
            </div>
            <div class="text-sm text-theme-secondary space-y-1">
              ${statusText}
            </div>
          </div>
        `;
      } else {
        resultsDiv.innerHTML = `
          <div class="text-center py-8 text-theme-muted">
            <i class="fas fa-car text-4xl opacity-30 mb-3"></i>
            <p>未找到车牌 ${plate} 的信息</p>
          </div>
        `;
      }
    } catch (error) {
      loadingDiv.classList.add('hidden');
      resultsDiv.innerHTML = `
        <div class="text-center py-8 text-red-500">
          <i class="fas fa-exclamation-circle text-4xl mb-3"></i>
          <p>查询失败，请稍后重试</p>
        </div>
      `;
    }
  }
  
  // 输入框回车触发搜索
  document.getElementById('exit-plate').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchForExit();
  });
  
  document.getElementById('search-plate').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchVehicle();
  });
  
  // 重置出场模态框状态
  function resetExitModal() {
    document.getElementById('exit-plate').value = '';
    document.getElementById('exit-result').classList.add('hidden');
    document.getElementById('exit-not-found').classList.add('hidden');
    document.getElementById('exit-loading').classList.add('hidden');
  }
  
  // 重置搜索模态框状态
  function resetSearchModal() {
    document.getElementById('search-plate').value = '';
    document.getElementById('search-loading').classList.add('hidden');
    document.getElementById('search-results').innerHTML = `
      <div class="text-center py-8 text-theme-muted">
        <i class="fas fa-search text-4xl opacity-30 mb-3"></i>
        <p>输入车牌号进行查询</p>
      </div>
    `;
  }
  
  // 使用公共工具库中的 openModal 和 closeModal（已在 utils.js 中定义）
  
  // 打开模态框时重置状态（使用公共工具库的 openModal）
  const originalOpenQuickEntry = window.openQuickEntry;
  window.openQuickEntry = function() {
    document.getElementById('entry-form').reset();
    document.getElementById('entry-plate-status').classList.add('hidden');
    document.getElementById('entry-plate-error').classList.add('hidden');
    document.getElementById('entry-space-field').classList.add('hidden');
    window.openModal('entry-modal');
    // 延迟聚焦到第一个输入框，确保plate-grid已初始化
    setTimeout(() => {
      const firstCell = document.querySelector('[data-plate-grid-for="entry-plate"] .plate-cell');
      if (firstCell) {
        firstCell.focus();
      }
    }, 300);
  };
  
  const originalOpenQuickExit = window.openQuickExit;
  window.openQuickExit = function() {
    resetExitModal();
    window.openModal('exit-modal');
    // 延迟聚焦到第一个输入框，确保plate-grid已初始化
    setTimeout(() => {
      const firstCell = document.querySelector('[data-plate-grid-for="exit-plate"] .plate-cell');
      if (firstCell) {
        firstCell.focus();
      }
    }, 300);
  };
  
  const originalOpenQuickSearch = window.openQuickSearch;
  window.openQuickSearch = function() {
    resetSearchModal();
    window.openModal('search-modal');
    // 延迟聚焦到第一个输入框，确保plate-grid已初始化
    setTimeout(() => {
      const firstCell = document.querySelector('[data-plate-grid-for="search-plate"] .plate-cell');
      if (firstCell) {
        firstCell.focus();
      }
    }, 300);
  };
  
  // 导出更新函数供dashboard调用
  window.updateDashboardDataFromModal = updateDashboardDataFromModal;