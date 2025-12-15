// 使用公共工具库中的函数
async function deleteTemplate(id, name) {
    if (!confirm(`确定要删除模板 "${name}" 吗？\n\n如果该模板正在被使用，将无法删除。`)) {
        return;
    }
    
    // 获取删除 URL 模板（从 data 属性获取）
    const container = document.querySelector('[data-delete-url-template]');
    const urlTemplate = container ? container.dataset.deleteUrlTemplate : '';
    const url = urlTemplate.replace('0', id);
    
    const result = await window.apiRequest(url, {
        method: 'POST',
        showToast: true
    });
    
    if (result.success) {
        location.reload();
    }
}