// 页面加载完成后淡出加载动画
  window.addEventListener('load', function() {
    const loader = document.getElementById('page-loader');
    if (loader) {
      setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
      }, 300);
    }
  });