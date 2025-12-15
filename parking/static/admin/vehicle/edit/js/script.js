// 车辆表单前端验证（提交前）
function validateVehicleForm(event) {
    // ========== 前端验证（提交前） ==========
    
    // 1. 验证车牌号（必填）
    const plateInput = document.getElementById('id_license_plate');
    const plateGrid = document.querySelector('[data-plate-grid-for="id_license_plate"]');
    let plate = '';
    
    if (plateInput) {
        plate = plateInput.value.trim();
    }
    
    if (!plate && plateGrid) {
        // 尝试从车牌网格获取
        const plateCells = plateGrid.querySelectorAll('.plate-cell');
        plate = Array.from(plateCells).map(cell => cell.textContent.trim()).join('');
    }
    
    if (!plate || plate.trim() === '') {
        alert('请输入车牌号');
        if (plateGrid) {
            const firstCell = plateGrid.querySelector('.plate-cell');
            if (firstCell) firstCell.focus();
        } else if (plateInput) {
            plateInput.focus();
        }
        event.preventDefault();
        return false;
    }
    
    plate = plate.toUpperCase().trim();
    
    // 验证车牌号格式（7位普通车牌或8位新能源车牌）
    const plateRegex = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/;
    if (!plateRegex.test(plate)) {
        alert('车牌号格式不正确，请输入有效的车牌号');
        if (plateGrid) {
            const firstCell = plateGrid.querySelector('.plate-cell');
            if (firstCell) firstCell.focus();
        } else if (plateInput) {
            plateInput.focus();
        }
        event.preventDefault();
        return false;
    }
    
    // 2. 验证车辆类型（必填）
    const vehicleTypeRadio = document.querySelector('input[name="vehicle_type"]:checked');
    if (!vehicleTypeRadio) {
        alert('请选择车辆类型');
        event.preventDefault();
        return false;
    }
    
    // 所有验证通过，允许提交
    return true;
}