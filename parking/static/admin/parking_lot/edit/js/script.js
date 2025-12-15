// 停车场类型数据（从 data 属性获取）
let floors = [];
let areas = {};

function loadParkingLotData() {
    const form = document.querySelector('form[data-parking-lot-data]');
    if (form) {
        try {
            floors = JSON.parse(form.dataset.floors || '[]');
            areas = JSON.parse(form.dataset.areas || '{}');
        } catch (e) {
            console.error('Failed to parse parking lot data:', e);
            floors = [];
            areas = {};
        }
    }
}
// 页面加载时初始化数据
loadParkingLotData();

// 处理停车场类型变化
function handleLotTypeChange() {
    const lotType = document.getElementById('lot-type').value;
    const floorsSection = document.getElementById('floors-section');
    const areasSection = document.getElementById('areas-section');
    
    if (lotType === 'outdoor') {
        floorsSection.classList.add('hidden');
        areasSection.classList.add('hidden');
        floors = [];
        areas = {};
    } else {
        floorsSection.classList.remove('hidden');
        areasSection.classList.remove('hidden');
        if (floors.length === 0) {
            floors = ['1F'];
        }
        renderFloors();
        renderAreas();
    }
    updateHiddenInputs();
}

// 添加楼层
function addFloor() {
    const floorName = prompt('请输入楼层名称（如：B2, 1F, 2F）:');
    if (floorName && floorName.trim()) {
        const floor = floorName.trim();
        if (!floors.includes(floor)) {
            floors.push(floor);
            if (!areas[floor]) {
                areas[floor] = [];
            }
            renderFloors();
            renderAreas();
            updateHiddenInputs();
        } else {
            alert('该楼层已存在');
        }
    }
}

// 删除楼层
function removeFloor(floor) {
    if (confirm(`确定要删除楼层 "${floor}" 吗？这将同时删除该楼层的所有区域。`)) {
        floors = floors.filter(f => f !== floor);
        delete areas[floor];
        renderFloors();
        renderAreas();
        updateHiddenInputs();
    }
}

// 渲染楼层列表
function renderFloors() {
    const container = document.getElementById('floors-list');
    container.innerHTML = '';
    
    floors.forEach(floor => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2 p-2 bg-slate-900/50 rounded-lg';
        div.innerHTML = `
            <span class="flex-1 text-white font-mono">${floor}</span>
            <button type="button" onclick="removeFloor('${floor}')" 
                    class="px-2 py-1 text-red-400 hover:text-red-300 transition-colors">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    });
}

// 添加区域
function addArea(floor) {
    const areaName = prompt(`为楼层 "${floor}" 添加区域（如：A区、B区）:`);
    if (areaName && areaName.trim()) {
        const area = areaName.trim();
        if (!areas[floor].includes(area)) {
            areas[floor].push(area);
            renderAreas();
            updateHiddenInputs();
        } else {
            alert('该区域已存在');
        }
    }
}

// 删除区域
function removeArea(floor, area) {
    areas[floor] = areas[floor].filter(a => a !== area);
    renderAreas();
    updateHiddenInputs();
}

// 渲染区域列表
function renderAreas() {
    const container = document.getElementById('areas-list');
    container.innerHTML = '';
    
    floors.forEach(floor => {
        if (!areas[floor]) {
            areas[floor] = [];
        }
        
        const div = document.createElement('div');
        div.className = 'p-3 bg-slate-900/50 rounded-lg';
        div.innerHTML = `
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-slate-300">${floor}</span>
                <button type="button" onclick="addArea('${floor}')" 
                        class="px-2 py-1 text-xs bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors">
                    <i class="fas fa-plus mr-1"></i>添加区域
                </button>
            </div>
            <div class="flex flex-wrap gap-2" id="areas-${floor}">
                ${areas[floor].map(area => `
                    <span class="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm">
                        ${area}
                        <button type="button" onclick="removeArea('${floor}', '${area}')" 
                                class="text-red-400 hover:text-red-300">
                            <i class="fas fa-times text-xs"></i>
                        </button>
                    </span>
                `).join('')}
                ${areas[floor].length === 0 ? '<span class="text-xs text-slate-500">暂无区域</span>' : ''}
            </div>
        `;
        container.appendChild(div);
    });
}

// 更新隐藏输入
function updateHiddenInputs() {
    document.getElementById('floors-input').value = JSON.stringify(floors);
    document.getElementById('areas-input').value = JSON.stringify(areas);
}

// 表单提交前验证和更新
document.querySelector('form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // ========== 前端验证（提交前） ==========
    let hasError = false;
    
    // 1. 验证停车场名称（必填）
    const nameInput = document.getElementById('name-input');
    const name = nameInput.value.trim();
    if (!name) {
        alert('请输入停车场名称');
        nameInput.focus();
        return;
    }
    if (name.length > 100) {
        alert('停车场名称长度不能超过100个字符');
        nameInput.focus();
        return;
    }
    
    // 2. 验证总车位数（必填，正整数）
    const totalSpacesInput = document.getElementById('total-spaces-input');
    const totalSpaces = parseInt(totalSpacesInput.value);
    if (!totalSpacesInput.value || isNaN(totalSpaces) || totalSpaces <= 0) {
        alert('请输入有效的总车位数（正整数）');
        totalSpacesInput.focus();
        return;
    }
    
    // 3. 验证小时费率（必填，非负数）
    const hourlyRateInput = document.getElementById('hourly-rate-input');
    const hourlyRate = parseFloat(hourlyRateInput.value);
    if (!hourlyRateInput.value || isNaN(hourlyRate) || hourlyRate < 0) {
        alert('请输入有效的小时费率（非负数）');
        hourlyRateInput.focus();
        return;
    }
    
    // 4. 验证楼层和区域数据
    if (floors.length === 0) {
        alert('请至少添加一个楼层');
        return;
    }
    
    // 所有验证通过，更新隐藏字段并提交
    updateHiddenInputs();
    
    // 使用FormData提交（保持原有提交方式）
    const form = e.target;
    const formData = new FormData(form);
    
    fetch(form.action || window.location.href, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': formData.get('csrfmiddlewaretoken')
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json().catch(() => ({ success: true }));
        }
        return response.json().then(data => ({ success: false, message: data.message || '保存失败' }));
    })
    .then(result => {
        if (result.success) {
            alert('保存成功');
            // 从 data 属性获取列表 URL
            const listUrl = form.dataset.listUrl || '/';
            window.location.href = result.redirect_url || listUrl;
        } else {
            alert('保存失败：' + (result.message || '未知错误'));
        }
    })
    .catch(error => {
        console.error('提交失败:', error);
        alert('保存失败，请稍后重试');
    });
});

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    if (floors.length > 0) {
        renderFloors();
    }
    if (Object.keys(areas).length > 0) {
        renderAreas();
    }
});