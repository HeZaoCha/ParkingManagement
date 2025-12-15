// 密码可见性切换
document.getElementById('toggleNewPassword').addEventListener('click', function() {
  const input = document.getElementById('new_password');
  const icon = this.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  }
});

document.getElementById('toggleConfirmPassword').addEventListener('click', function() {
  const input = document.getElementById('confirm_password');
  const icon = this.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  } else {
    input.type = 'password';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  }
});

// 检查密码强度（使用评分系统）
function checkPasswordStrength(password) {
  const bar = document.getElementById('password-strength-bar');
  const text = document.getElementById('password-strength-text');
  const submitBtn = document.getElementById('submit-btn');
  
  if (!password) {
    bar.style.width = '0%';
    bar.className = 'password-strength bg-theme-secondary';
    text.textContent = '密码强度：未设置';
    text.className = 'text-xs mt-1 text-theme-muted';
    submitBtn.disabled = false;
    return { score: 0, level: 'none', isValid: false };
  }
  
  let score = 0;
  let level = 'very_weak';
  let strengthText = '非常弱';
  let strengthColor = 'bg-red-500';
  let textColor = 'text-red-500';
  
  // 1. 密码长度评分
  if (password.length <= 4) {
    score += 5;
  } else if (password.length >= 5 && password.length <= 7) {
    score += 10;
  } else if (password.length >= 8) {
    score += 25;
  }
  
  // 2. 字母评分
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  if (!hasLower && !hasUpper) {
    score += 0;
  } else if ((hasLower && !hasUpper) || (!hasLower && hasUpper)) {
    score += 10;
  } else if (hasLower && hasUpper) {
    score += 20;
  }
  
  // 3. 数字评分
  const digitCount = (password.match(/\d/g) || []).length;
  if (digitCount === 0) {
    score += 0;
  } else if (digitCount === 1) {
    score += 10;
  } else {
    score += 20;
  }
  
  // 4. 符号评分
  const symbolCount = (password.match(/[^a-zA-Z0-9]/g) || []).length;
  if (symbolCount === 0) {
    score += 0;
  } else if (symbolCount === 1) {
    score += 10;
  } else {
    score += 25;
  }
  
  // 5. 奖励分（仅取最高项）
  if (hasLower && hasUpper && digitCount > 0 && symbolCount > 0) {
    score += 5; // 大小写字母、数字和符号组合
  } else if ((hasLower || hasUpper) && digitCount > 0 && symbolCount > 0) {
    score += 3; // 字母、数字和符号组合
  } else if ((hasLower || hasUpper) && digitCount > 0) {
    score += 2; // 字母和数字组合
  }
  
  // 根据总分确定等级
  if (score >= 90) {
    level = 'very_secure';
    strengthText = '非常安全';
    strengthColor = 'bg-emerald-600';
    textColor = 'text-emerald-600';
  } else if (score >= 80) {
    level = 'secure';
    strengthText = '安全';
    strengthColor = 'bg-emerald-500';
    textColor = 'text-emerald-500';
  } else if (score >= 70) {
    level = 'very_strong';
    strengthText = '非常强';
    strengthColor = 'bg-emerald-400';
    textColor = 'text-emerald-400';
  } else if (score >= 60) {
    level = 'strong';
    strengthText = '强';
    strengthColor = 'bg-blue-500';
    textColor = 'text-blue-500';
  } else if (score >= 50) {
    level = 'average';
    strengthText = '中';
    strengthColor = 'bg-yellow-500';
    textColor = 'text-yellow-500';
  } else if (score >= 25) {
    level = 'weak';
    strengthText = '弱';
    strengthColor = 'bg-orange-500';
    textColor = 'text-orange-500';
  } else {
    level = 'very_weak';
    strengthText = '非常弱';
    strengthColor = 'bg-red-500';
    textColor = 'text-red-500';
  }
  
  // 计算进度条宽度（基于总分，最高100分）
  const width = Math.min((score / 100) * 100, 100);
  bar.style.width = width + '%';
  bar.className = `password-strength ${strengthColor}`;
  text.textContent = `密码强度：${strengthText} (${score}分)`;
  text.className = `text-xs mt-1 ${textColor}`;
  
  // 检查是否达到最低要求（至少50分，中级）
  const isValid = score >= 50;
  if (!isValid && password.length > 0) {
    text.innerHTML += ' <span class="text-red-500">（需要至少中级强度）</span>';
  }
  
  // 更新提交按钮状态
  const confirmPassword = document.getElementById('confirm_password').value;
  if (isValid && password === confirmPassword && confirmPassword.length > 0) {
    submitBtn.disabled = false;
  } else if (!isValid) {
    submitBtn.disabled = true;
  }
  
  return { score, level, isValid };
}

// 检查密码匹配
function checkPasswordMatch() {
  const newPassword = document.getElementById('new_password').value;
  const confirmPassword = document.getElementById('confirm_password').value;
  const hint = document.getElementById('password-match-hint');
  const submitBtn = document.getElementById('submit-btn');
  
  if (confirmPassword.length === 0) {
    hint.classList.add('hidden');
    submitBtn.disabled = true;
    return;
  }
  
  if (newPassword === confirmPassword) {
    hint.className = 'text-xs mt-2 text-emerald-500';
    hint.innerHTML = '<i class="fas fa-check-circle mr-1"></i>密码匹配';
    
    // 检查密码强度
    const strengthResult = checkPasswordStrength(newPassword);
    if (strengthResult.isValid) {
      submitBtn.disabled = false;
    } else {
      submitBtn.disabled = true;
    }
  } else {
    hint.className = 'text-xs mt-2 text-red-500';
    hint.innerHTML = '<i class="fas fa-times-circle mr-1"></i>密码不匹配';
    submitBtn.disabled = true;
  }
  hint.classList.remove('hidden');
}

// 重发验证码
async function resendCode() {
  const email = document.querySelector('[name="email"]').value;
  const resendBtn = document.getElementById('resend-btn');
  const originalText = resendBtn.innerHTML;
  
  resendBtn.disabled = true;
  resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  
  const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
  
  try {
    const response = await fetch(form.dataset.sendCodeUrl || '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken
      },
      body: JSON.stringify({
        code_type: 'email',
        target: email,
        purpose: 'reset_password'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('验证码已重新发送');
    } else {
      alert(result.message || '发送失败，请稍后重试');
    }
  } catch (error) {
    alert('网络错误，请稍后重试');
  } finally {
    resendBtn.disabled = false;
    resendBtn.innerHTML = originalText;
  }
}

// 表单提交
document.getElementById('reset-password-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // ========== 前端验证（提交前） ==========
  
  const form = e.target;
  const submitBtn = document.getElementById('submit-btn');
  const messageContainer = document.getElementById('message-container');
  const messageContent = document.getElementById('message-content');
  const originalBtnText = submitBtn.innerHTML;
  
  // 1. 验证验证码（必填）
  const codeInput = document.getElementById('verification-code-input');
  const code = codeInput.value.trim();
  if (!code) {
    messageContainer.classList.remove('hidden');
    messageContent.className = 'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
    messageContent.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas fa-exclamation-circle"></i>
        <span>请输入验证码</span>
      </div>
    `;
    codeInput.focus();
    return;
  }
  if (!/^\d{6}$/.test(code)) {
    messageContainer.classList.remove('hidden');
    messageContent.className = 'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
    messageContent.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas fa-exclamation-circle"></i>
        <span>验证码必须是6位数字</span>
      </div>
    `;
    codeInput.focus();
    return;
  }
  
  // 2. 验证新密码（必填）
  const newPasswordInput = document.getElementById('new_password');
  const newPassword = newPasswordInput.value;
  if (!newPassword) {
    messageContainer.classList.remove('hidden');
    messageContent.className = 'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
    messageContent.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas fa-exclamation-circle"></i>
        <span>请输入新密码</span>
      </div>
    `;
    newPasswordInput.focus();
    return;
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    messageContainer.classList.remove('hidden');
    messageContent.className = 'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
    messageContent.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas fa-exclamation-circle"></i>
        <span>密码长度必须在8-128个字符之间</span>
      </div>
    `;
    newPasswordInput.focus();
    return;
  }
  
  // 3. 验证确认密码（必填）
  const confirmPasswordInput = document.getElementById('confirm_password');
  const confirmPassword = confirmPasswordInput.value;
  if (!confirmPassword) {
    messageContainer.classList.remove('hidden');
    messageContent.className = 'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
    messageContent.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas fa-exclamation-circle"></i>
        <span>请再次输入密码</span>
      </div>
    `;
    confirmPasswordInput.focus();
    return;
  }
  
  // 4. 验证密码匹配
  if (newPassword !== confirmPassword) {
    messageContainer.classList.remove('hidden');
    messageContent.className = 'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
    messageContent.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas fa-exclamation-circle"></i>
        <span>两次输入的密码不一致</span>
      </div>
    `;
    confirmPasswordInput.focus();
    return;
  }
  
  // 5. 检查密码强度
  const strengthResult = checkPasswordStrength(newPassword);
  if (!strengthResult.isValid) {
    messageContainer.classList.remove('hidden');
    messageContent.className = 'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
    messageContent.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas fa-exclamation-circle"></i>
        <span>密码强度不足，需要至少中级强度（50分以上）</span>
      </div>
      <p class="text-xs mt-2">建议：至少8位，包含大小写字母、数字和符号</p>
    `;
    newPasswordInput.focus();
    return;
  }
  
  // 所有验证通过，准备提交
  
  // 禁用按钮
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>重置中...';
  
  // 获取CSRF token
  const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
  
  try {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const response = await fetch(form.dataset.resetPasswordUrl || '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    // 显示消息
    messageContainer.classList.remove('hidden');
    
    if (result.success) {
      messageContent.className = 'p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300';
      messageContent.innerHTML = `
        <div class="flex items-center gap-2">
          <i class="fas fa-check-circle"></i>
          <span>${result.message}</span>
        </div>
      `;
      
      // 3秒后跳转到登录页
      setTimeout(() => {
        window.location.href = result.redirect_url || form.dataset.loginUrl || '';
      }, 3000);
    } else {
      messageContent.className = 'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
      messageContent.innerHTML = `
        <div class="flex items-center gap-2">
          <i class="fas fa-exclamation-circle"></i>
          <span>${result.message}</span>
        </div>
      `;
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  } catch (error) {
    messageContainer.classList.remove('hidden');
    messageContent.className = 'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
    messageContent.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas fa-exclamation-circle"></i>
        <span>网络错误，请稍后重试</span>
      </div>
    `;
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
});