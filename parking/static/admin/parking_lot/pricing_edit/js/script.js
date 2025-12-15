
// 使用公共工具库中的 getCsrfToken

function toggleChargeType() {
    const chargeType = document.querySelector('input[name="charge_type"]:checked').value;
    const fixedDiv = document.getElementById('fixed-pricing');
    const tieredDiv = document.getElementById('tiered-pricing');
    
    if (chargeType === 'fixed') {
        fixedDiv.style.display = 'block';
        tieredDiv.style.display = 'none';
    } else {
        fixedDiv.style.display = 'none';
        tieredDiv.style.display = 'block';
    }
}

function loadTemplate() {
    const templateId = document.getElementById('template-select').value;
    if (templateId) {
        // 如果选择了模板，可以在这里加载模板的详细配置
        // 这里简化处理，实际应该通过AJAX获取模板详情
    }
}

// 费率预览计算（使用后端API）
async function calculatePreview() {
    const duration = parseInt(document.getElementById('preview-duration').value) || 0;
    const chargeType = document.querySelector('input[name="charge_type"]:checked')?.value || 'fixed';
    const previewFee = document.getElementById('preview-fee');
    const previewDetails = document.getElementById('preview-details');
    const previewBreakdown = document.getElementById('preview-breakdown');
    
    if (duration <= 0) {
        previewFee.textContent = '¥0.00';
        previewDetails.classList.add('hidden');
        return;
    }
    
    // 准备请求数据
    const data = {
        duration_minutes: duration,
        charge_type: chargeType,
        lot_id: parseInt(form?.dataset.lotId || '0'),
        hourly_rate: chargeType === 'fixed' ? (document.getElementById('hourly-rate').value || 0) : null,
        free_minutes: chargeType === 'tiered' ? (parseInt(document.getElementById('free-minutes').value) || 15) : null,
        daily_max_fee: chargeType === 'tiered' ? (document.getElementById('daily-max-fee').value || null) : null,
        template_id: chargeType === 'tiered' ? (document.getElementById('template-select').value || null) : null
    };
    
    try {
        const response = await fetch('{% url "parking:api_pricing_preview" %}', {
            method: 'POST',
            headers: {
                'X-CSRFToken': window.getCsrfToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            previewFee.textContent = `¥${parseFloat(result.fee).toFixed(2)}`;
            
            if (result.breakdown && result.breakdown.length > 0) {
                previewBreakdown.innerHTML = result.breakdown.map(item => `<div>• ${item}</div>`).join('');
                previewDetails.classList.remove('hidden');
            } else {
                previewDetails.classList.add('hidden');
            }
        } else {
            previewFee.textContent = '计算失败';
            previewDetails.classList.add('hidden');
        }
    } catch (error) {
        console.error('预览计算失败:', error);
        previewFee.textContent = '计算失败';
        previewDetails.classList.add('hidden');
    }
}

// 监听费率配置变化
document.getElementById('hourly-rate')?.addEventListener('input', calculatePreview);
document.getElementById('free-minutes')?.addEventListener('input', calculatePreview);
document.getElementById('daily-max-fee')?.addEventListener('input', calculatePreview);
document.getElementById('template-select')?.addEventListener('change', calculatePreview);
document.querySelectorAll('input[name="charge_type"]').forEach(radio => {
    radio.addEventListener('change', function() {
        toggleChargeType();
        calculatePreview();
    });
});

// 初始化预览
calculatePreview();

document.getElementById('pricing-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // ========== 前端验证（提交前） ==========
    
    // 1. 验证收费类型
    const chargeTypeRadio = document.querySelector('input[name="charge_type"]:checked');
    if (!chargeTypeRadio) {
        alert('请选择收费类型');
        return;
    }
    const chargeType = chargeTypeRadio.value;
    
    // 2. 验证固定费率
    if (chargeType === 'fixed') {
        const hourlyRateInput = document.getElementById('hourly-rate');
        const hourlyRate = parseFloat(hourlyRateInput.value);
        if (!hourlyRateInput.value || isNaN(hourlyRate) || hourlyRate < 0) {
            alert('请输入有效的小时费率（非负数）');
            hourlyRateInput.focus();
            return;
        }
    }
    
    // 3. 验证阶梯费率
    if (chargeType === 'tiered') {
        const templateSelect = document.getElementById('template-select');
        const templateId = templateSelect.value;
        
        if (!templateId) {
            alert('请选择费率模板');
            templateSelect.focus();
            return;
        }
        
        // 验证免费时长（可选，但如果有值必须是正整数）
        const freeMinutesInput = document.getElementById('free-minutes');
        if (freeMinutesInput.value) {
            const freeMinutes = parseInt(freeMinutesInput.value);
            if (isNaN(freeMinutes) || freeMinutes < 0) {
                alert('免费时长必须是正整数');
                freeMinutesInput.focus();
                return;
            }
        }
        
        // 验证每日上限（可选，但如果有值必须是非负数）
        const dailyMaxFeeInput = document.getElementById('daily-max-fee');
        if (dailyMaxFeeInput.value) {
            const dailyMaxFee = parseFloat(dailyMaxFeeInput.value);
            if (isNaN(dailyMaxFee) || dailyMaxFee < 0) {
                alert('每日上限必须是非负数');
                dailyMaxFeeInput.focus();
                return;
            }
        }
    }
    
    // 所有验证通过，准备提交
    const data = {
        charge_type: chargeType,
        template_id: chargeType === 'tiered' ? document.getElementById('template-select').value : null,
        hourly_rate: chargeType === 'fixed' ? parseFloat(document.getElementById('hourly-rate').value) : null,
        free_minutes: chargeType === 'tiered' ? (document.getElementById('free-minutes').value ? parseInt(document.getElementById('free-minutes').value) : 15) : null,
        daily_max_fee: chargeType === 'tiered' ? (document.getElementById('daily-max-fee').value ? parseFloat(document.getElementById('daily-max-fee').value) : null) : null
    };
    
    try {
        const saveUrl = form?.dataset.saveUrl || '';
        const detailUrl = form?.dataset.detailUrl || '';
        
        const response = await fetch(saveUrl, {
            method: 'POST',
            headers: {
                'X-CSRFToken': window.getCsrfToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('保存成功');
            location.href = detailUrl;
        } else {
            alert('保存失败：' + result.message);
        }
    } catch (error) {
        alert('保存失败：' + error.message);
    }
});