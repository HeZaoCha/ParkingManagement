// 根据选择的停车场加载楼层和区域
document.querySelector('[name="parking_lot"]').addEventListener('change', async function() {
    const lotId = this.value;
    const floorField = document.getElementById('floor-field');
    const areaField = document.getElementById('area-field');
    const floorSelect = document.getElementById('floor-select');
    const areaSelect = document.getElementById('area-select');
    
    if (!lotId) {
        floorField.classList.add('hidden');
        areaField.classList.add('hidden');
        return;
    }
    
    try {
        // 使用API获取停车场详细信息
        const response = await fetch(`/parking/api/lots/${lotId}/`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.success && result.data) {
                const lot = result.data;
                
                if (lot.floors && lot.floors.length > 0) {
                    // 显示楼层选择
                    floorField.classList.remove('hidden');
                    floorSelect.innerHTML = '<option value="">无（露天停车场）</option>';
                    lot.floors.forEach(floor => {
                        const option = document.createElement('option');
                        option.value = floor;
                        option.textContent = floor;
                        // 从 data 属性获取当前楼层
                        const form = document.querySelector('form[data-parking-space-data]');
                        const currentFloor = form?.dataset.currentFloor;
                        if (currentFloor && option.value === currentFloor) {
                            option.selected = true;
                        }
                        floorSelect.appendChild(option);
                    });
                    
                    // 显示区域选择
                    areaField.classList.remove('hidden');
                    const firstFloor = lot.floors[0];
                    // 从 data 属性获取当前楼层
                    const form = document.querySelector('form[data-parking-space-data]');
                    const currentFloor = form?.dataset.currentFloor || firstFloor;
                    updateAreaOptions(lot.areas, currentFloor);
                    
                    // 楼层变化时更新区域选项
                    floorSelect.addEventListener('change', function() {
                        const selectedFloor = this.value;
                        updateAreaOptions(lot.areas, selectedFloor);
                    });
                } else {
                    floorField.classList.add('hidden');
                    areaField.classList.add('hidden');
                }
            }
        }
    } catch (error) {
        console.error('加载停车场信息失败:', error);
    }
});

function updateAreaOptions(areas, floor) {
    const areaSelect = document.getElementById('area-select');
    areaSelect.innerHTML = '<option value="">无</option>';
    
    if (areas && areas[floor] && areas[floor].length > 0) {
        areas[floor].forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            // 从 data 属性获取当前区域
            const form = document.querySelector('form[data-parking-space-data]');
            const currentArea = form?.dataset.currentArea;
            if (currentArea && option.value === currentArea) {
                option.selected = true;
            }
            areaSelect.appendChild(option);
        });
    }
}

// 页面加载时如果有选中的停车场，自动加载
document.addEventListener('DOMContentLoaded', function() {
    const lotSelect = document.querySelector('[name="parking_lot"]');
    if (lotSelect.value) {
        lotSelect.dispatchEvent(new Event('change'));
    }
});

// 车位表单前端验证（提交前）
function validateParkingSpaceForm(event) {
    // ========== 前端验证（提交前） ==========
    
    // 1. 验证停车场（必填）
    const lotSelect = document.getElementById('parking-lot-select');
    if (!lotSelect || !lotSelect.value) {
        alert('请选择所属停车场');
        if (lotSelect) lotSelect.focus();
        event.preventDefault();
        return false;
    }
    
    // 2. 验证车位号（必填）
    const spaceNumberInput = document.getElementById('space-number-input');
    const spaceNumber = spaceNumberInput ? spaceNumberInput.value.trim() : '';
    if (!spaceNumber) {
        alert('请输入车位号');
        if (spaceNumberInput) spaceNumberInput.focus();
        event.preventDefault();
        return false;
    }
    
    // 3. 验证车位类型（必填）
    const spaceTypeSelect = document.getElementById('space-type-select');
    if (!spaceTypeSelect || !spaceTypeSelect.value) {
        alert('请选择车位类型');
        if (spaceTypeSelect) spaceTypeSelect.focus();
        event.preventDefault();
        return false;
    }
    
    // 所有验证通过，允许提交
    return true;
}