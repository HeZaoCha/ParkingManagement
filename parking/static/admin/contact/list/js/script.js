// 使用公共工具库中的 getCsrfToken 和 apiRequest

let currentMessageId = null;

let messageModalPreviousActiveElement = null;
let replyModalPreviousActiveElement = null;

async function viewMessage(id) {
    // 保存当前焦点
    messageModalPreviousActiveElement = document.activeElement;
    
    const modal = document.getElementById('message-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('message-content').innerHTML = '<p class="text-slate-400">加载中...</p>';
    
    // 聚焦到关闭按钮
    setTimeout(() => {
        const closeBtn = modal.querySelector('button[aria-label*="关闭"]');
        if (closeBtn) closeBtn.focus();
    }, 100);
    
    // 实际应该从服务器获取完整消息内容
}

function closeMessageModal() {
    const modal = document.getElementById('message-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    
    // 恢复焦点
    if (messageModalPreviousActiveElement && messageModalPreviousActiveElement.focus) {
        messageModalPreviousActiveElement.focus();
    }
    messageModalPreviousActiveElement = null;
}

function replyMessage(id) {
    // 保存当前焦点
    replyModalPreviousActiveElement = document.activeElement;
    
    currentMessageId = id;
    document.getElementById('reply-content').value = '';
    const modal = document.getElementById('reply-modal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // 聚焦到回复内容输入框
    setTimeout(() => {
        const textarea = document.getElementById('reply-content');
        if (textarea) textarea.focus();
    }, 100);
}

function closeReplyModal() {
    const modal = document.getElementById('reply-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    currentMessageId = null;
    
    // 恢复焦点
    if (replyModalPreviousActiveElement && replyModalPreviousActiveElement.focus) {
        replyModalPreviousActiveElement.focus();
    }
    replyModalPreviousActiveElement = null;
}

async function submitReply() {
    // ========== 前端验证（提交前） ==========
    
    // 1. 验证回复内容（必填）
    const contentInput = document.getElementById('reply-content');
    const content = contentInput.value.trim();
    if (!content) {
        alert('请输入回复内容');
        contentInput.focus();
        return;
    }
    if (content.length > 2000) {
        alert('回复内容长度不能超过2000个字符');
        contentInput.focus();
        return;
    }
    
    // 2. 验证当前消息ID
    if (!currentMessageId) {
        alert('未选择要回复的消息');
        return;
    }
    
    // 所有验证通过，准备提交
    
    try {
        const replyModal = document.getElementById('reply-modal');
        if (!replyModal || !replyModal.dataset.replyUrlTemplate) {
            alert('回复URL未找到');
            return;
        }
        
        const replyUrl = replyModal.dataset.replyUrlTemplate.replace('0', currentMessageId);
        const response = await fetch(replyUrl, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reply: content })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('回复成功');
            closeReplyModal();
            location.reload();
        } else {
            alert('回复失败：' + result.message);
        }
    } catch (error) {
        alert('回复失败：' + error.message);
    }
}

// ESC键关闭模态框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const messageModal = document.getElementById('message-modal');
        const replyModal = document.getElementById('reply-modal');
        if (messageModal && !messageModal.classList.contains('hidden')) {
            closeMessageModal();
        } else if (replyModal && !replyModal.classList.contains('hidden')) {
            closeReplyModal();
        }
    }
});

// 点击背景关闭模态框
document.getElementById('message-modal').addEventListener('click', (e) => {
    if (e.target.id === 'message-modal') {
        closeMessageModal();
    }
});

document.getElementById('reply-modal').addEventListener('click', (e) => {
    if (e.target.id === 'reply-modal') {
        closeReplyModal();
    }
});