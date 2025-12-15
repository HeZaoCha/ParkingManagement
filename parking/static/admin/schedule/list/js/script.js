let currentScheduleView = 'table';

function switchScheduleView(view) {
    currentScheduleView = view;
    
    // 更新按钮状态
    document.getElementById('view-table-btn').className = 
        view === 'table' ? 'px-4 py-2 bg-primary-600 text-white rounded-lg transition-colors' :
        'px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors';
    document.getElementById('view-week-btn').className = 
        view === 'week' ? 'px-4 py-2 bg-primary-600 text-white rounded-lg transition-colors' :
        'px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors';
    document.getElementById('view-stats-btn').className = 
        view === 'stats' ? 'px-4 py-2 bg-primary-600 text-white rounded-lg transition-colors' :
        'px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors';
    
    // 更新时间轴按钮状态
    const timelineBtn = document.getElementById('view-timeline-btn');
    if (timelineBtn) {
        timelineBtn.className = 
            view === 'timeline' ? 'px-4 py-2 bg-primary-600 text-white rounded-lg transition-colors' :
            'px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors';
        timelineBtn.setAttribute('aria-selected', view === 'timeline' ? 'true' : 'false');
    }
    
    // 显示/隐藏对应视图
    document.getElementById('schedule-table-view').classList.toggle('hidden', view !== 'table');
    document.getElementById('schedule-week-view').classList.toggle('hidden', view !== 'week');
    document.getElementById('schedule-stats-view').classList.toggle('hidden', view !== 'stats');
    const timelineView = document.getElementById('schedule-timeline-view');
    if (timelineView) {
        timelineView.classList.toggle('hidden', view !== 'timeline');
    }
    
    // 如果切换到时间轴视图，检测冲突
    if (view === 'timeline') {
        detectScheduleConflicts();
    }
}

async function uploadSchedule() {
    const fileInput = document.getElementById('schedule-file');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        alert('请选择Excel文件（.xlsx 或 .xls）');
        fileInput.value = '';
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    // 获取上传 URL 和 CSRF Token
    const uploadUrl = document.querySelector('[data-upload-url]')?.dataset.uploadUrl || '';
    
    // 使用公共工具库中的 getCsrfToken
    
    try {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'X-CSRFToken': window.getCsrfToken()
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            let message = `导入完成！\n成功：${result.success_count} 条`;
            if (result.error_count > 0) {
                message += `\n失败：${result.error_count} 条`;
                if (result.errors && result.errors.length > 0) {
                    message += '\n\n错误详情：\n' + result.errors.slice(0, 5).join('\n');
                }
            }
            alert(message);
            location.reload();
        } else {
            alert('上传失败：' + result.message);
        }
    } catch (error) {
        alert('上传失败：' + error.message);
    } finally {
        fileInput.value = '';
    }
}

// 时间轴视图数据（从 data 属性获取）
let scheduleData = [];
function loadScheduleData() {
    const dataElement = document.querySelector('[data-schedule-data]');
    if (dataElement) {
        try {
            scheduleData = JSON.parse(dataElement.dataset.scheduleData || '[]');
        } catch (e) {
            console.error('Failed to parse schedule data:', e);
            scheduleData = [];
        }
    }
}
// 页面加载时初始化数据
loadScheduleData();

// 检测排班冲突
function detectScheduleConflicts() {
    const conflicts = [];
    const conflictMap = new Map();
    
    // 按停车场和星期分组
    const grouped = {};
    scheduleData.forEach(s => {
        const key = `${s.lot}_${s.weekday}`;
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(s);
    });
    
    // 检测每个分组内的冲突
    Object.values(grouped).forEach(group => {
        // 按开始时间排序
        group.sort((a, b) => a.startMinutes - b.startMinutes);
        
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
                const s1 = group[i];
                const s2 = group[j];
                
                // 检查时间重叠
                if (s1.endMinutes > s2.startMinutes && s1.startMinutes < s2.endMinutes) {
                    const conflictKey = `${s1.lot}_${s1.weekday}_${Math.min(s1.id, s2.id)}_${Math.max(s1.id, s2.id)}`;
                    if (!conflictMap.has(conflictKey)) {
                        conflicts.push({
                            lot: s1.lot,
                            weekday: s1.weekdayName,
                            schedule1: s1,
                            schedule2: s2,
                            overlapStart: Math.max(s1.startMinutes, s2.startMinutes),
                            overlapEnd: Math.min(s1.endMinutes, s2.endMinutes)
                        });
                        conflictMap.set(conflictKey, true);
                    }
                }
            }
        }
    });
    
    // 显示冲突提示
    const conflictAlert = document.getElementById('conflict-alert');
    const conflictCount = document.getElementById('conflict-count');
    if (conflicts.length > 0) {
        conflictAlert.classList.remove('hidden');
        conflictCount.textContent = conflicts.length;
    } else {
        conflictAlert.classList.add('hidden');
    }
    
    // 渲染时间轴
    renderTimeline(conflicts);
}

// 渲染时间轴视图
function renderTimeline(conflicts) {
    const container = document.getElementById('timeline-container');
    container.innerHTML = '';
    
    // 按停车场分组
    const lotGroups = {};
    scheduleData.forEach(s => {
        if (!lotGroups[s.lot]) {
            lotGroups[s.lot] = [];
        }
        lotGroups[s.lot].push(s);
    });
    
    // 创建冲突映射
    const conflictMap = new Map();
    conflicts.forEach(c => {
        conflictMap.set(c.schedule1.id, true);
        conflictMap.set(c.schedule2.id, true);
    });
    
    // 渲染每个停车场的时间轴
    Object.keys(lotGroups).sort().forEach(lotName => {
        const schedules = lotGroups[lotName];
        
        // 按星期分组
        const weekdayGroups = {};
        schedules.forEach(s => {
            if (!weekdayGroups[s.weekday]) {
                weekdayGroups[s.weekday] = [];
            }
            weekdayGroups[s.weekday].push(s);
        });
        
        // 创建停车场卡片
        const lotCard = document.createElement('div');
        lotCard.className = 'bg-slate-900/50 rounded-lg p-4 border border-slate-700/50';
        lotCard.innerHTML = `
            <h4 class="text-lg font-semibold text-white mb-4">${lotName}</h4>
            <div class="space-y-4">
                ${Object.keys(weekdayGroups).sort().map(weekday => {
                    const daySchedules = weekdayGroups[weekday].sort((a, b) => a.startMinutes - b.startMinutes);
                    const weekdayName = daySchedules[0].weekdayName;
                    return `
                        <div>
                            <h5 class="text-sm font-medium text-slate-300 mb-2">${weekdayName}</h5>
                            <div class="relative" style="height: ${daySchedules.length * 60}px;">
                                ${daySchedules.map((s, idx) => {
                                    const left = (s.startMinutes / (24 * 60)) * 100;
                                    const width = ((s.endMinutes - s.startMinutes) / (24 * 60)) * 100;
                                    const hasConflict = conflictMap.has(s.id);
                                    return `
                                        <div class="absolute ${hasConflict ? 'bg-red-500/30 border-red-500' : 'bg-primary-500/30 border-primary-500'} border rounded-lg p-2" 
                                             style="left: ${left}%; width: ${width}%; top: ${idx * 60}px; height: 50px;"
                                             title="${s.user} ${s.startTime}-${s.endTime}${hasConflict ? ' (冲突)' : ''}">
                                            <div class="text-xs text-white font-medium">${s.user}</div>
                                            <div class="text-xs text-slate-300">${s.startTime}-${s.endTime}</div>
                                            ${hasConflict ? '<i class="fas fa-exclamation-triangle text-red-400 text-xs mt-1"></i>' : ''}
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.appendChild(lotCard);
    });
}