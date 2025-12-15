let currentRecordId = null;

let checkoutPreviousActiveElement = null;

async function checkoutRecord(pk) {
    // 保存当前焦点
    checkoutPreviousActiveElement = document.activeElement;
    
    const result = await apiRequest(`/manage/records/${pk}/checkout/`, { method: 'POST' });
    
    if (result.success) {
        currentRecordId = pk;
        document.getElementById('checkout-fee').textContent = '¥' + result.fee;
        document.getElementById('checkout-duration').textContent = result.duration;
        const modal = document.getElementById('checkout-modal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // 聚焦到支付按钮
        setTimeout(() => {
            const payBtn = document.getElementById('pay-now-btn');
            if (payBtn) payBtn.focus();
        }, 100);
    }
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    
    // 恢复焦点
    if (checkoutPreviousActiveElement && checkoutPreviousActiveElement.focus) {
        checkoutPreviousActiveElement.focus();
    }
    checkoutPreviousActiveElement = null;
    
    location.reload();
}

document.getElementById('pay-now-btn').addEventListener('click', async function() {
    if (currentRecordId) {
        await payRecord(currentRecordId);
        closeCheckoutModal();
    }
});

async function payRecord(pk) {
    const result = await apiRequest(`/manage/records/${pk}/pay/`, { method: 'POST' });
    if (result.success) {
        setTimeout(() => location.reload(), 500);
    }
}

// ESC键关闭结算模态框
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const modal = document.getElementById('checkout-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeCheckoutModal();
        }
    }
});

// 点击背景关闭结算模态框
document.getElementById('checkout-modal').addEventListener('click', (e) => {
    if (e.target.id === 'checkout-modal') {
        closeCheckoutModal();
    }
});