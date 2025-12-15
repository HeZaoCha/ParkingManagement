let currentCreateMode = 'simple';
let selectedFile = null;

let batchModalPreviousActiveElement = null;

function showBatchCreateModal() {
    // 保存当前焦点
    batchModalPreviousActiveElement = document.activeElement;
    
    const modal = document.getElementById('batch-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    switchCreateMode('simple');
    updatePreview();
    
    // 聚焦到第一个输入框
    setTimeout(() => {
        const firstInput = modal.querySelector('select, input');
        if (firstInput) firstInput.focus();
    }, 100);
}

function closeBatchModal() {
    const modal = document.getElementById('batch-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    currentCreateMode = 'simple';
    selectedFile = null;
    
    // 恢复焦点
    if (batchModalPreviousActiveElement && batchModalPreviousActiveElement.focus) {
        batchModalPreviousActiveElement.focus();
    }
    batchModalPreviousActiveElement = null;
}

// ESC键关闭批量创建模态框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('batch-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeBatchModal();
        }
    }
});

// 点击背景关闭批量创建模态框
document.getElementById('batch-modal').addEventListener('click', (e) => {
    if (e.target.id === 'batch-modal') {
        closeBatchModal();
    }
});

function switchCreateMode(mode) {
    currentCreateMode = mode;
    
    // 更新按钮状态
    document.getElementById('mode-simple-btn').className = 
        mode === 'simple' ? 'flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg transition-colors' :
        'flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors';
    document.getElementById('mode-range-btn').className = 
        mode === 'range' ? 'flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg transition-colors' :
        'flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors';
    document.getElementById('mode-file-btn').className = 
        mode === 'file' ? 'flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg transition-colors' :
        'flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors';
    
    // 显示/隐藏对应模式
    document.getElementById('create-mode-simple').classList.toggle('hidden', mode !== 'simple');
    document.getElementById('create-mode-range').classList.toggle('hidden', mode !== 'range');
    document.getElementById('create-mode-file').classList.toggle('hidden', mode !== 'file');
    
    // 更新模板下载链接
    if (mode === 'file') {
        const lotId = document.getElementById('file-lot').value;
        document.getElementById('template-link').href = `/parking/manage/lots/${lotId}/spaces/template/`;
    }
}

function updatePreview() {
    const prefix = document.getElementById('batch-prefix').value || 'A';
    const start = parseInt(document.getElementById('batch-start').value) || 1;
    const count = parseInt(document.getElementById('batch-count').value) || 10;
    const end = start + count - 1;
    
    const startNum = String(start).padStart(3, '0');
    const endNum = String(end).padStart(3, '0');
    
    document.getElementById('batch-preview').textContent = `${prefix}${startNum} ~ ${prefix}${endNum}`;
}

function updateRangePreview() {
    const start = document.getElementById('range-start').value.trim();
    const end = document.getElementById('range-end').value.trim();
    
    if (start && end) {
        // 简单验证格式
        if (/^[A-Z]+\d+$/.test(start.toUpperCase()) && /^[A-Z]+\d+$/.test(end.toUpperCase())) {
            document.getElementById('range-preview').textContent = `${start.toUpperCase()} ~ ${end.toUpperCase()}`;
        } else {
            document.getElementById('range-preview').textContent = '格式错误（应为：A001）';
        }
    } else {
        document.getElementById('range-preview').textContent = '-';
    }
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        selectedFile = file;
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');
        
        fileName.textContent = file.name;
        fileSize.textContent = `大小: ${(file.size / 1024).toFixed(2)} KB`;
        fileInfo.classList.remove('hidden');
    }
}

// 事件监听
document.getElementById('batch-prefix')?.addEventListener('input', updatePreview);
document.getElementById('batch-start')?.addEventListener('input', updatePreview);
document.getElementById('batch-count')?.addEventListener('input', updatePreview);
document.getElementById('range-start')?.addEventListener('input', updateRangePreview);
document.getElementById('range-end')?.addEventListener('input', updateRangePreview);
document.getElementById('file-lot')?.addEventListener('change', function() {
    if (currentCreateMode === 'file') {
        document.getElementById('template-link').href = `/parking/manage/lots/${this.value}/spaces/template/`;
    }
});

// 拖拽上传
const fileDropZone = document.querySelector('#create-mode-file .border-dashed');
if (fileDropZone) {
    fileDropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileDropZone.classList.add('border-primary-500');
    });
    
    fileDropZone.addEventListener('dragleave', () => {
        fileDropZone.classList.remove('border-primary-500');
    });
    
    fileDropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDropZone.classList.remove('border-primary-500');
        const file = e.dataTransfer.files[0];
        if (file) {
            document.getElementById('file-input').files = e.dataTransfer.files;
            handleFileSelect({ target: { files: e.dataTransfer.files } });
        }
    });
}

async function submitBatchCreate() {
    const submitBtn = document.getElementById('submit-batch-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>创建中...';
    
    try {
        if (currentCreateMode === 'simple') {
            // 简单创建
            const data = {
                lot_id: document.getElementById('batch-lot').value,
                prefix: document.getElementById('batch-prefix').value,
                start: parseInt(document.getElementById('batch-start').value),
                count: parseInt(document.getElementById('batch-count').value),
                space_type: 'standard'
            };
            
            // 从 data 属性获取批量创建 URL
            const batchCreateUrl = document.querySelector('[data-batch-create-url]')?.dataset.batchCreateUrl || '';
            const result = await apiRequest(batchCreateUrl, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            
            if (result.success) {
                // 显示详细结果
                showBatchResult({
                    count: result.count || 0,
                    skipped: 0,
                    created_list: [],
                    skipped_list: [],
                    failed_count: 0,
                    failed_lines: [],
                    message: result.message || '创建成功'
                });
            } else {
                alert(result.message || '创建失败');
            }
        } else if (currentCreateMode === 'range') {
            // 范围创建
            const lotId = document.getElementById('range-lot').value;
            const start = document.getElementById('range-start').value.trim();
            const end = document.getElementById('range-end').value.trim();
            const spaceType = document.getElementById('range-space-type').value;
            
            if (!start || !end) {
                alert('请输入起始和结束车位号');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }
            
            const formData = new FormData();
            formData.append('start', start);
            formData.append('end', end);
            formData.append('space_type', spaceType);
            
            const response = await fetch(`/parking/manage/lots/${lotId}/spaces/create-range/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 显示详细结果
                showBatchResult(result);
            } else {
                alert(result.message || '创建失败');
            }
        } else if (currentCreateMode === 'file') {
            // 文件上传
            if (!selectedFile) {
                alert('请选择要上传的文件');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }
            
            const lotId = document.getElementById('file-lot').value;
            const formData = new FormData();
            formData.append('file', selectedFile);
            
            const response = await fetch(`/parking/manage/lots/${lotId}/spaces/create-file/`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 显示详细结果
                showBatchResult(result);
            } else {
                alert(result.message || '创建失败');
            }
        }
    } catch (error) {
        console.error('批量创建失败:', error);
        alert('创建失败，请稍后重试');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
    
    // 显示批量创建结果
    function showBatchResult(result) {
        closeBatchModal(); // 先关闭创建模态框
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-slate-900/80 modal-backdrop flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="modal-content bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-slate-700">
                    <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                        <i class="fas fa-check-circle text-emerald-400"></i>
                        批量创建结果
                    </h3>
                </div>
                <div class="p-6 space-y-4">
                    <div class="grid grid-cols-3 gap-4">
                        <div class="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-4">
                            <p class="text-sm text-slate-400">创建成功</p>
                            <p class="text-2xl font-bold text-emerald-400">${result.count || 0}</p>
                        </div>
                        <div class="bg-amber-500/20 border border-amber-500/30 rounded-lg p-4">
                            <p class="text-sm text-slate-400">跳过（已存在）</p>
                            <p class="text-2xl font-bold text-amber-400">${result.skipped || 0}</p>
                        </div>
                        <div class="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                            <p class="text-sm text-slate-400">解析失败</p>
                            <p class="text-2xl font-bold text-red-400">${result.failed_count || 0}</p>
                        </div>
                    </div>
                    
                    ${result.created_list && result.created_list.length > 0 ? `
                    <div>
                        <h4 class="text-sm font-medium text-slate-300 mb-2">创建成功的车位号：</h4>
                        <div class="max-h-32 overflow-y-auto bg-slate-900/50 rounded-lg p-3">
                            <div class="flex flex-wrap gap-2">
                                ${result.created_list.map(num => `<span class="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-mono">${num}</span>`).join('')}
                                ${result.has_more_created ? '<span class="text-xs text-slate-500">... 还有更多</span>' : ''}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${result.skipped_list && result.skipped_list.length > 0 ? `
                    <div>
                        <h4 class="text-sm font-medium text-slate-300 mb-2">跳过的车位号（已存在）：</h4>
                        <div class="max-h-32 overflow-y-auto bg-slate-900/50 rounded-lg p-3">
                            <div class="flex flex-wrap gap-2">
                                ${result.skipped_list.map(num => `<span class="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-mono">${num}</span>`).join('')}
                                ${result.has_more_skipped ? '<span class="text-xs text-slate-500">... 还有更多</span>' : ''}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    
                    ${result.failed_lines && result.failed_lines.length > 0 ? `
                    <div>
                        <h4 class="text-sm font-medium text-slate-300 mb-2">解析失败的行：</h4>
                        <div class="max-h-32 overflow-y-auto bg-slate-900/50 rounded-lg p-3">
                            <div class="space-y-1 text-xs text-slate-400">
                                ${result.failed_lines.map(f => `<div>第${f.line}行: ${f.content} - ${f.reason}</div>`).join('')}
                                ${result.has_more_failed ? '<div>... 还有更多</div>' : ''}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                <div class="flex gap-3 border-t border-slate-700" role="group" aria-label="操作按钮">
                    <button type="button"
                            onclick="exportBatchResult(${JSON.stringify(result).replace(/"/g, '&quot;')})" 
                            class="flex-1 px-6 py-3 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                            aria-label="导出创建结果">
                        <i class="fas fa-download mr-2" aria-hidden="true"></i>
                        导出结果
                    </button>
                    <button type="button"
                            onclick="this.closest('.modal-backdrop').remove(); location.reload();" 
                            class="flex-1 px-6 py-3 bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                            aria-label="关闭并刷新页面">
                        确定
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // 导出批量创建结果
    function exportBatchResult(result) {
        // 创建Excel内容
        const data = [];
        
        // 添加统计信息
        data.push(['批量创建结果统计']);
        data.push([]);
        data.push(['创建成功', result.count || 0]);
        data.push(['跳过（已存在）', result.skipped || 0]);
        data.push(['解析失败', result.failed_count || 0]);
        data.push([]);
        
        // 添加创建成功的车位号
        if (result.created_list && result.created_list.length > 0) {
            data.push(['创建成功的车位号']);
            result.created_list.forEach(num => {
                data.push([num]);
            });
            if (result.has_more_created) {
                data.push(['... 还有更多']);
            }
            data.push([]);
        }
        
        // 添加跳过的车位号
        if (result.skipped_list && result.skipped_list.length > 0) {
            data.push(['跳过的车位号（已存在）']);
            result.skipped_list.forEach(num => {
                data.push([num]);
            });
            if (result.has_more_skipped) {
                data.push(['... 还有更多']);
            }
            data.push([]);
        }
        
        // 添加解析失败的行
        if (result.failed_lines && result.failed_lines.length > 0) {
            data.push(['解析失败的行', '原因']);
            result.failed_lines.forEach(f => {
                data.push([`第${f.line}行: ${f.content}`, f.reason]);
            });
            if (result.has_more_failed) {
                data.push(['... 还有更多', '']);
            }
        }
        
        // 转换为CSV格式（简单实现，也可以使用Excel库）
        const csvContent = data.map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        
        // 添加BOM以支持中文
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `批量创建结果_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 使用公共工具库中的 apiRequest（已在 utils.js 中定义）