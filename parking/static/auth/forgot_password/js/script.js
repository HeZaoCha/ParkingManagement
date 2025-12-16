// 常见邮箱后缀列表
const EMAIL_DOMAINS = [
  'qq.com', '163.com', '126.com', 'sina.com', 'sina.cn',
  'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com',
  'foxmail.com', '139.com', 'yeah.net', 'sohu.com',
  'tom.com', '21cn.com', '189.cn', 'aliyun.com'
];

let selectedSuggestionIndex = -1;
let suggestions = [];

// 邮箱输入处理
function handleEmailInput(value) {
  const input = document.getElementById('username_or_email');
  const suggestionsDiv = document.getElementById('email-suggestions');
  const validationHint = document.getElementById('email-validation-hint');
  
  // 隐藏验证提示
  validationHint.classList.add('hidden');
  
  // 检查是否包含@符号
  if (value.includes('@')) {
    const parts = value.split('@');
    if (parts.length === 2) {
      const prefix = parts[0];
      const suffix = parts[1].toLowerCase();
      
      // 如果后缀已完整，验证邮箱格式
      if (suffix && !suffix.includes(' ')) {
        validateEmailFormat(value);
      }
      
      // 如果后缀不完整，显示建议
      if (suffix.length > 0 && !EMAIL_DOMAINS.some(d => d === suffix)) {
        suggestions = EMAIL_DOMAINS
          .filter(domain => domain.startsWith(suffix))
          .slice(0, 5);
        
        if (suggestions.length > 0) {
          showEmailSuggestions(prefix, suggestions);
          selectedSuggestionIndex = -1;
        } else {
          suggestionsDiv.classList.add('hidden');
        }
      } else if (EMAIL_DOMAINS.includes(suffix)) {
        // 后缀完整且匹配，隐藏建议
        suggestionsDiv.classList.add('hidden');
        validateEmailFormat(value);
      } else {
        suggestionsDiv.classList.add('hidden');
      }
    } else {
      suggestionsDiv.classList.add('hidden');
    }
  } else {
    // 没有@符号，隐藏建议
    suggestionsDiv.classList.add('hidden');
  }
}

// 显示邮箱后缀建议
function showEmailSuggestions(prefix, domainSuggestions) {
  const suggestionsDiv = document.getElementById('email-suggestions');
  suggestionsDiv.innerHTML = '';
  
  domainSuggestions.forEach((domain, index) => {
    const item = document.createElement('div');
    item.className = 'email-suggestion-item';
    item.textContent = `${prefix}@${domain}`;
    item.dataset.domain = domain;
    item.dataset.index = index;
    item.onclick = () => selectEmailSuggestion(prefix, domain);
    item.onmouseenter = () => {
      selectedSuggestionIndex = index;
      updateSuggestionSelection();
    };
    suggestionsDiv.appendChild(item);
  });
  
  suggestionsDiv.classList.remove('hidden');
}

// 更新建议选中状态
function updateSuggestionSelection() {
  const items = document.querySelectorAll('.email-suggestion-item');
  items.forEach((item, index) => {
    if (index === selectedSuggestionIndex) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
}

// 选择邮箱后缀建议
function selectEmailSuggestion(prefix, domain) {
  const input = document.getElementById('username_or_email');
  input.value = `${prefix}@${domain}`;
  document.getElementById('email-suggestions').classList.add('hidden');
  validateEmailFormat(input.value);
  input.focus();
}

// 处理键盘事件
function handleEmailKeydown(event) {
  const suggestionsDiv = document.getElementById('email-suggestions');
  
  if (!suggestionsDiv.classList.contains('hidden') && suggestions.length > 0) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
      updateSuggestionSelection();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      updateSuggestionSelection();
    } else if (event.key === 'Enter' && selectedSuggestionIndex >= 0) {
      event.preventDefault();
      const input = document.getElementById('username_or_email');
      const value = input.value;
      if (value.includes('@')) {
        const prefix = value.split('@')[0];
        selectEmailSuggestion(prefix, suggestions[selectedSuggestionIndex]);
      }
    } else if (event.key === 'Escape') {
      suggestionsDiv.classList.add('hidden');
      selectedSuggestionIndex = -1;
    }
  }
}

// 验证邮箱格式
function validateEmailFormat(email) {
  const validationHint = document.getElementById('email-validation-hint');
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (email.includes('@')) {
    if (emailRegex.test(email)) {
      validationHint.className = 'text-xs mt-1 text-emerald-500';
      validationHint.innerHTML = '<i class="fas fa-check-circle mr-1"></i>邮箱格式正确';
      validationHint.classList.remove('hidden');
    } else {
      validationHint.className = 'text-xs mt-1 text-red-500';
      validationHint.innerHTML = '<i class="fas fa-exclamation-circle mr-1"></i>邮箱格式不正确';
      validationHint.classList.remove('hidden');
    }
  } else {
    validationHint.classList.add('hidden');
  }
}

// 点击外部关闭建议列表
document.addEventListener('click', function(e) {
  const input = document.getElementById('username_or_email');
  const suggestionsDiv = document.getElementById('email-suggestions');
  
  if (!input.contains(e.target) && !suggestionsDiv.contains(e.target)) {
    suggestionsDiv.classList.add('hidden');
  }
});

document.getElementById('forgot-password-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // ========== 前端验证（提交前） ==========
  
  const form = e.target;
  const submitBtn = document.getElementById('submit-btn');
  const messageContainer = document.getElementById('message-container');
  const messageContent = document.getElementById('message-content');
  const originalBtnText = submitBtn.innerHTML;
  
  // 1. 验证用户名或邮箱（必填）
  const inputValue = document.getElementById('username_or_email').value.trim();
  if (!inputValue) {
    messageContainer.classList.remove('hidden');
    messageContent.className = 'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
    messageContent.innerHTML = `
      <div class="flex items-center gap-2">
        <i class="fas fa-exclamation-circle"></i>
        <span>请输入用户名或邮箱地址</span>
      </div>
    `;
    document.getElementById('username_or_email').focus();
    return;
  }
  
  // 2. 验证邮箱格式（如果是邮箱输入）
  if (inputValue.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inputValue)) {
      messageContainer.classList.remove('hidden');
      messageContent.className = 'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
      messageContent.innerHTML = `
        <div class="flex items-center gap-2">
          <i class="fas fa-exclamation-circle"></i>
          <span>邮箱格式不正确，请输入有效的邮箱地址</span>
        </div>
      `;
      document.getElementById('username_or_email').focus();
      return;
    }
  }
  
  // 所有验证通过，准备提交
  // 禁用按钮
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>发送中...';
  
  // 获取CSRF token
  const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
  
  try {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const response = await fetch(form.dataset.forgotPasswordUrl || '', {
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
        ${result.email ? `<p class="text-xs mt-2 text-emerald-600 dark:text-emerald-400">验证码已发送到：${result.email}</p>` : ''}
        <div class="mt-3">
          <a href="${form.dataset.resetPasswordUrl}?email=${encodeURIComponent(document.getElementById('username_or_email').value)}" 
             class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors hover:scale-105 active:scale-95">
            <i class="fas fa-arrow-right"></i>
            前往重置密码
          </a>
        </div>
      `;
      
      // 如果知道邮箱，自动跳转（延迟2秒）
      const emailInput = document.getElementById('username_or_email').value;
      if (emailInput) {
        const resetPasswordUrl = form.dataset.resetPasswordUrl;
        if (resetPasswordUrl) {
          setTimeout(() => {
            window.location.href = `${resetPasswordUrl}?email=${encodeURIComponent(emailInput)}`;
          }, 2000);
        }
      }
    } else {
      messageContent.className = 'p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
      messageContent.innerHTML = `
        <div class="flex items-center gap-2">
          <i class="fas fa-exclamation-circle"></i>
          <span>${result.message}</span>
        </div>
      `;
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
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
});