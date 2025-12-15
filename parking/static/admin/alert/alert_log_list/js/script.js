let currentAlertId = null;

let handleModalPreviousActiveElement = null;

function handleAlert(id) {
    // 保存当前焦点
    handleModalPreviousActiveElement = document.activeElement;
    
    currentAlertId = id;
    const modal = document.getElementById('handle-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // 聚焦到备注输入框
    setTimeout(() => {
        const textarea = document.getElementById('handle-notes');
        if (textarea) textarea.focus();
    }, 100);
}

function closeHandleModal() {
    const modal = document.getElementById('handle-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    document.getElementById('handle-form').reset();
    currentAlertId = null;
    
    // 恢复焦点
    if (handleModalPreviousActiveElement && handleModalPreviousActiveElement.focus) {
        handleModalPreviousActiveElement.focus();
    }
    handleModalPreviousActiveElement = null;
}

// ESC键关闭处理模态框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('handle-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeHandleModal();
        }
    }
});

// 点击背景关闭处理模态框
document.getElementById('handle-modal').addEventListener('click', (e) => {
    if (e.target.id === 'handle-modal') {
        closeHandleModal();
    }
});

document.getElementById('handle-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // ========== 前端验证（提交前） ==========
    
    // 1. 验证处理状态（必填）
    const statusSelect = document.getElementById('handle-status');
    if (!statusSelect || !statusSelect.value) {
        alert('请选择处理状态');
        if (statusSelect) statusSelect.focus();
        return;
    }
    
    // 2. 验证备注（如果填写了，检查长度）
    const notesTextarea = document.getElementById('handle-notes');
    if (notesTextarea && notesTextarea.value.trim()) {
        const notes = notesTextarea.value.trim();
        if (notes.length > 1000) {
            alert('备注长度不能超过1000个字符');
            notesTextarea.focus();
            return;
        }
    }
    
    // 所有验证通过，准备提交
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`/parking/manage/alert/logs/${currentAlertId}/handle/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',
            },
            body: JSON.stringify(data),
        });
        
        const result = await response.json();
        
        if (result.success) {
            location.reload();
        } else {
            alert('处理失败：' + result.message);
        }
    } catch (error) {
        alert('处理失败，请稍后重试');
    }
});