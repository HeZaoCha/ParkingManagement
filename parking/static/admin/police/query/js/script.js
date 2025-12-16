function exportData() {
    const form = document.querySelector('form[data-api-police-query-url]');
    if (!form || !form.dataset.apiPoliceQueryUrl) {
        console.error('API URL not found');
        return;
    }
    const params = new URLSearchParams(window.location.search);
    params.set('format', 'json');
    window.location.href = form.dataset.apiPoliceQueryUrl + '?' + params.toString();
}