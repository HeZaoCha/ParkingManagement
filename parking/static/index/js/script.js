document.addEventListener('DOMContentLoaded', function() {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    // 切换密码可见性
    if (togglePassword && passwordInput) {
      togglePassword.addEventListener('click', function() {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        const type = isPassword ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
        this.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
        this.setAttribute('aria-label', isPassword ? '隐藏密码' : '显示密码');
      });
    }
    
    // 输入框焦点动画
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('focus', function() {
        this.parentElement.classList.add('ring-2', 'ring-primary-500/20', 'rounded-xl');
      });
      input.addEventListener('blur', function() {
        this.parentElement.classList.remove('ring-2', 'ring-primary-500/20', 'rounded-xl');
      });
    });
  });
  
  // 切换到注册页面
  function switchToRegister() {
    window.location.href = document.querySelector('[data-register-url]')?.dataset.registerUrl || '';
  }