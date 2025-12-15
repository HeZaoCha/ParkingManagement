function exportData() {
    const params = new URLSearchParams(window.location.search);
    params.set('format', 'json');
    window.location.href = '{% url "parking:api_police_query" %}?' + params.toString();
}