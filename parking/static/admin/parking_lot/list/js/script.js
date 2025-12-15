async function toggleStatus(pk, name) {
    const result = await apiRequest(`/manage/lots/${pk}/toggle/`, { method: 'POST' });
    if (result.success) {
        setTimeout(() => location.reload(), 500);
    }
}