document.getElementById('wanted-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // ========== 前端验证（提交前） ==========
    
    // 1. 验证车牌号（必填）
    const plateInput = document.querySelector('input[name="license_plate"]');
    const plateField = document.querySelector('[data-plate-grid-for]');
    let plate = '';
    
    if (plateField) {
        // 从车牌网格获取
        const plateCells = plateField.querySelectorAll('.plate-cell');
        plate = Array.from(plateCells).map(cell => cell.textContent.trim()).join('');
    } else if (plateInput) {
        plate = plateInput.value.trim();
    }
    
    if (!plate) {
        alert('请输入车牌号');
        if (plateField) {
            const firstCell = plateField.querySelector('.plate-cell');
            if (firstCell) firstCell.focus();
        } else if (plateInput) {
            plateInput.focus();
        }
        return;
    }
    
    // 验证车牌号格式（7位普通车牌或8位新能源车牌）
    const plateRegex = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/;
    if (!plateRegex.test(plate)) {
        alert('车牌号格式不正确，请输入有效的车牌号');
        if (plateField) {
            const firstCell = plateField.querySelector('.plate-cell');
            if (firstCell) firstCell.focus();
        } else if (plateInput) {
            plateInput.focus();
        }
        return;
    }
    
    // 2. 验证原因（必填）
    const reasonInput = document.querySelector('textarea[name="reason"]') || document.querySelector('input[name="reason"]');
    if (reasonInput) {
        const reason = reasonInput.value.trim();
        if (!reason) {
            alert('请输入通缉原因');
            reasonInput.focus();
            return;
        }
        if (reason.length > 500) {
            alert('通缉原因长度不能超过500个字符');
            reasonInput.focus();
            return;
        }
    }
    
    // 所有验证通过，准备提交
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    // 确保车牌号是大写
    if (data.license_plate) {
        data.license_plate = data.license_plate.toUpperCase();
    }
    
    try {
        const response = await fetch(this.action || window.location.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': data.csrfmiddlewaretoken,
            },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.location.href = document.querySelector('[data-wanted-list-url]')?.dataset.wantedListUrl || '';
        } else {
            alert('保存失败：' + result.message);
        }
    } catch (error) {
        alert('保存失败，请稍后重试');
    }
});