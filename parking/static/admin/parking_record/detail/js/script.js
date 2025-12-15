async function checkoutRecord(pk) {
    const result = await apiRequest(`/manage/records/${pk}/checkout/`, { method: 'POST' });
    if (result.success) {
        setTimeout(() => location.reload(), 500);
    }
}

async function payRecord(pk) {
    const result = await apiRequest(`/manage/records/${pk}/pay/`, { method: 'POST' });
    if (result.success) {
        setTimeout(() => location.reload(), 500);
    }
}