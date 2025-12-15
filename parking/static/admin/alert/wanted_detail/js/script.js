function cancelWanted(id) {
    if (!confirm('确定要取消此通缉吗？')) return;
    
    fetch(`/parking/manage/alert/wanted/${id}/cancel/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || '',
        },
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            location.reload();
        } else {
            alert('操作失败：' + data.message);
        }
    });
}