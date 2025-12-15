// 从 data 属性获取初始规则索引
let ruleIndex = parseInt(document.getElementById('rules-container')?.dataset.initialRuleCount || '0');

function addRule() {
    const container = document.getElementById('rules-container');
    const emptyMsg = container.querySelector('.text-center');
    if (emptyMsg) emptyMsg.remove();
    
    const ruleHtml = `
        <div class="rule-item bg-slate-900/50 border border-slate-700 rounded-lg p-4" data-index="${ruleIndex}">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label class="block text-xs text-slate-400 mb-1">开始时间（分钟）</label>
                    <input type="number" class="rule-start-minutes w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm" 
                           value="0" min="0" required>
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">结束时间（分钟）</label>
                    <input type="number" class="rule-end-minutes w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm" 
                           value="" min="0" placeholder="留空表示无上限">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">费率（元/小时）</label>
                    <input type="number" class="rule-rate w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm" 
                           value="5.00" min="0" step="0.01" required>
                </div>
                <div class="flex items-end">
                    <button type="button" onclick="removeRule(this)" 
                            class="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors">
                        <i class="fas fa-trash mr-1"></i>删除
                    </button>
                </div>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', ruleHtml);
    ruleIndex++;
}

function removeRule(btn) {
    if (confirm('确定要删除这条规则吗？')) {
        btn.closest('.rule-item').remove();
        const container = document.getElementById('rules-container');
        if (container.children.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-500">
                    <i class="fas fa-info-circle mb-2"></i>
                    <p>暂无费率规则，请添加规则</p>
                </div>
            `;
        }
    }
}

document.getElementById('template-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // ========== 前端验证（提交前） ==========
    
    // 1. 验证模板名称（必填）
    const nameInput = document.getElementById('template-name');
    const name = nameInput.value.trim();
    if (!name) {
        alert('请输入模板名称');
        nameInput.focus();
        return;
    }
    if (name.length > 100) {
        alert('模板名称长度不能超过100个字符');
        nameInput.focus();
        return;
    }
    
    // 2. 验证费率规则
    const rules = [];
    let hasRuleError = false;
    
    document.querySelectorAll('.rule-item').forEach((item, idx) => {
        const startMinutesInput = item.querySelector('.rule-start-minutes');
        const endMinutesInput = item.querySelector('.rule-end-minutes');
        const rateInput = item.querySelector('.rule-rate');
        
        const startMinutes = parseInt(startMinutesInput.value);
        const endMinutes = endMinutesInput.value ? parseInt(endMinutesInput.value) : null;
        const rate = parseFloat(rateInput.value);
        
        // 验证起始分钟数
        if (isNaN(startMinutes) || startMinutes < 0) {
            alert(`第${idx + 1}条规则：起始分钟数必须是0或正整数`);
            startMinutesInput.focus();
            hasRuleError = true;
            return;
        }
        
        // 验证结束分钟数（如果有值）
        if (endMinutes !== null && (isNaN(endMinutes) || endMinutes <= startMinutes)) {
            alert(`第${idx + 1}条规则：结束分钟数必须大于起始分钟数`);
            endMinutesInput.focus();
            hasRuleError = true;
            return;
        }
        
        // 验证费率
        if (isNaN(rate) || rate < 0) {
            alert(`第${idx + 1}条规则：费率必须是非负数`);
            rateInput.focus();
            hasRuleError = true;
            return;
        }
        
        rules.push({
            start_minutes: startMinutes,
            end_minutes: endMinutes,
            rate_per_hour: rate
        });
    });
    
    if (hasRuleError) {
        return;
    }
    
    if (rules.length === 0) {
        alert('请至少添加一条费率规则');
        return;
    }
    
    // 3. 验证免费时长（可选，但如果有值必须是正整数）
    const freeMinutesInput = document.getElementById('free-minutes');
    if (freeMinutesInput.value) {
        const freeMinutes = parseInt(freeMinutesInput.value);
        if (isNaN(freeMinutes) || freeMinutes < 0) {
            alert('免费时长必须是正整数');
            freeMinutesInput.focus();
            return;
        }
    }
    
    // 4. 验证每日上限（可选，但如果有值必须是非负数）
    const dailyMaxFeeInput = document.getElementById('daily-max-fee');
    if (dailyMaxFeeInput.value) {
        const dailyMaxFee = parseFloat(dailyMaxFeeInput.value);
        if (isNaN(dailyMaxFee) || dailyMaxFee < 0) {
            alert('每日上限必须是非负数');
            dailyMaxFeeInput.focus();
            return;
        }
    }
    
    const data = {
        name: document.getElementById('template-name').value,
        description: document.getElementById('template-description').value,
        free_minutes: parseInt(document.getElementById('free-minutes').value) || 15,
        daily_max_fee: document.getElementById('daily-max-fee').value || null,
        rules: rules
    };
    
    try {
        // 从表单的 data 属性获取 URL
        const form = document.getElementById('template-form');
        const submitUrl = form.dataset.submitUrl;
        const listUrl = form.dataset.listUrl;
        
        // 使用公共工具库中的 getCsrfToken
        
        const response = await fetch(submitUrl, {
            method: 'POST',
            headers: {
                'X-CSRFToken': window.getCsrfToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (result.success) {
            location.href = listUrl;
        }
});