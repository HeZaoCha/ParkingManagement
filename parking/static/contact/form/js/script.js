// 初始化国际手机号输入组件
let contactPhoneInputInstance = null;

// 初始化函数（在DOMContentLoaded中调用）
function initContactPhoneInput() {
  const contactPhoneInput = document.getElementById('contact-phone-input');
  
  if (contactPhoneInput) {
    // 初始化 intl-tel-input 插件
    contactPhoneInputInstance = window.intlTelInput(contactPhoneInput, {
      initialCountry: 'cn', // 默认选择中国
      preferredCountries: ['cn', 'us', 'hk', 'tw', 'jp', 'kr', 'sg'], // 常用国家优先显示
      nationalMode: true, // 使用国家格式（输入框内不显示区号）
      formatAsYouType: true, // 输入时自动格式化
      autoPlaceholder: 'polite', // 自动设置占位符
      placeholderNumberType: 'MOBILE', // 使用手机号作为占位符
      countrySearch: true, // 启用国家搜索
      showSelectedDialCode: true, // 在国旗区域显示区号
      separateDialCode: true, // 将区号单独显示在国旗区域
      strictMode: true, // 严格模式：只允许数字，并根据国家自动限制最大长度
      loadUtils: () => import('https://cdn.jsdelivr.net/npm/intl-tel-input@25.13.1/build/js/utils.js'),
      // 自定义样式以匹配主题
      containerClass: 'w-full',
      // 支持IP自动检测（可选）
      geoIpLookup: function(callback) {
        // 可选：使用IP检测用户国家，这里默认使用中国
        callback('cn');
      }
    });
    
    // 监听国家变化事件
    contactPhoneInput.addEventListener('countrychange', function() {
      // 当使用 separateDialCode 时，区号会自动显示在国旗区域，输入框内只需要输入数字
      updateContactPhoneValidation(contactPhoneInput);
    });
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // 初始化联系表单手机号输入组件
  initContactPhoneInput();

// 验证手机号格式（使用 intl-tel-input 的验证方法）
function validatePhoneNumber() {
  const contactPhoneInput = document.getElementById('contact-phone-input');
  if (!contactPhoneInput || !contactPhoneInputInstance) {
    return { valid: false, message: '手机号输入框未初始化' };
  }
  
  const value = contactPhoneInput.value.trim();
  
  if (!value) {
    return { valid: false, message: '请输入手机号' };
  }
  
  // 使用 intl-tel-input 的验证方法
  if (contactPhoneInputInstance.isValidNumber()) {
    // 获取E.164格式的完整号码
    const fullNumber = contactPhoneInputInstance.getNumber();
    return { valid: true, cleaned: fullNumber, isInternational: true };
  } else {
    // 获取验证错误信息
    const errorCode = contactPhoneInputInstance.getValidationError();
    const errorMessages = {
      0: '手机号格式不正确',
      1: '国家代码无效',
      2: '号码过短',
      3: '号码过长',
      4: '号码格式不正确'
    };
    return { valid: false, message: errorMessages[errorCode] || '请输入有效的手机号' };
  }
}

function updateContactPhoneValidation(phoneInput) {
  if (!contactPhoneInputInstance) return;
  
  const errorDiv = document.getElementById('contact-phone-error');
  const validationIcon = document.getElementById('contact-phone-validation-icon');
  const validIcon = document.getElementById('contact-phone-valid-icon');
  const invalidIcon = document.getElementById('contact-phone-invalid-icon');
  
  const value = phoneInput.value.trim();
  
  if (!value) {
    errorDiv.classList.add('hidden');
    validationIcon.classList.add('hidden');
    phoneInput.setAttribute('aria-invalid', 'false');
    phoneInput.classList.remove('border-red-500', 'border-green-500');
    return;
  }
  
  const validation = validatePhoneNumber();
  
  if (validation.valid) {
    errorDiv.classList.add('hidden');
    validationIcon.classList.remove('hidden');
    validIcon.classList.remove('hidden');
    invalidIcon.classList.add('hidden');
    phoneInput.setAttribute('aria-invalid', 'false');
    phoneInput.classList.remove('border-red-500');
    phoneInput.classList.add('border-green-500');
  } else {
    errorDiv.textContent = validation.message;
    errorDiv.classList.remove('hidden');
    validationIcon.classList.remove('hidden');
    validIcon.classList.add('hidden');
    invalidIcon.classList.remove('hidden');
    phoneInput.setAttribute('aria-invalid', 'true');
    phoneInput.classList.remove('border-green-500');
    phoneInput.classList.add('border-red-500');
  }
}

// 初始化联系表单手机号验证
document.addEventListener('DOMContentLoaded', function() {
  const contactPhoneInput = document.getElementById('contact-phone-input');
  
  if (contactPhoneInput && contactPhoneInputInstance) {
    // 输入时实时验证
    contactPhoneInput.addEventListener('input', function() {
      // 延迟验证，避免频繁验证影响输入体验
      clearTimeout(contactPhoneInput.validationTimeout);
      contactPhoneInput.validationTimeout = setTimeout(() => {
        updateContactPhoneValidation(contactPhoneInput);
      }, 300);
    });
    
    // 失焦时验证
    contactPhoneInput.addEventListener('blur', function() {
      updateContactPhoneValidation(contactPhoneInput);
    });
  }
});

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = '/';
  }
}

let emailFormModalPreviousActiveElement = null;

function showEmailForm() {
  // 保存当前焦点
  emailFormModalPreviousActiveElement = document.activeElement;
  
  const modal = document.getElementById('email-form-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
  
  // 聚焦到第一个输入框
  setTimeout(() => {
    const firstInput = modal.querySelector('select, input, textarea');
    if (firstInput) firstInput.focus();
  }, 100);
}

function hideEmailForm() {
  const modal = document.getElementById('email-form-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
  
  // 恢复焦点
  if (emailFormModalPreviousActiveElement && emailFormModalPreviousActiveElement.focus) {
    emailFormModalPreviousActiveElement.focus();
  }
  emailFormModalPreviousActiveElement = null;
}

// ESC键关闭反馈表单模态框
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('email-form-modal');
    if (modal && !modal.classList.contains('hidden')) {
      hideEmailForm();
    }
  }
});

// 点击背景关闭反馈表单模态框
document.getElementById('email-form-modal').addEventListener('click', (e) => {
  if (e.target.id === 'email-form-modal') {
    hideEmailForm();
  }
});

function submitContactForm(event) {
  event.preventDefault();
  const form = event.target;
  
  // ========== 前端验证（提交前） ==========
  let hasError = false;
  
  // 1. 验证姓名（必填）
  const nameInput = document.getElementById('contact-name');
  const name = nameInput.value.trim();
  if (!name) {
    showContactFieldError('name', '请输入您的姓名');
    nameInput.focus();
    return;
  }
  if (name.length > 100) {
    showContactFieldError('name', '姓名长度不能超过100个字符');
    nameInput.focus();
    return;
  }
  clearContactFieldError('name');
  
  // 2. 验证邮箱（必填）
  const emailInput = document.getElementById('contact-email');
  const email = emailInput.value.trim();
  if (!email) {
    showContactFieldError('email', '请输入邮箱地址');
    emailInput.focus();
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showContactFieldError('email', '邮箱格式不正确');
    emailInput.focus();
    return;
  }
  clearContactFieldError('email');
  
  // 3. 验证手机号（如果填写了）
  const phoneInput = document.getElementById('contact-phone-input');
  if (phoneInput && phoneInput.value && contactPhoneInputInstance) {
    const validation = validatePhoneNumber();
    if (!validation.valid) {
      showContactFieldError('phone', validation.message);
      phoneInput.focus();
      updateContactPhoneValidation(phoneInput);
      return;
    }
    // 使用 intl-tel-input 获取E.164格式的完整号码
    const fullNumber = contactPhoneInputInstance.getNumber();
    if (fullNumber) {
      phoneInput.value = fullNumber;
    }
    clearContactFieldError('phone');
  }
  
  // 4. 验证主题（必填）
  const subjectInput = document.getElementById('contact-subject');
  const subject = subjectInput.value.trim();
  if (!subject) {
    showContactFieldError('subject', '请输入主题');
    subjectInput.focus();
    return;
  }
  if (subject.length > 200) {
    showContactFieldError('subject', '主题长度不能超过200个字符');
    subjectInput.focus();
    return;
  }
  clearContactFieldError('subject');
  
  // 5. 验证内容（必填）
  const contentInput = document.getElementById('contact-content');
  const content = contentInput.value.trim();
  if (!content) {
    showContactFieldError('content', '请输入详细内容');
    contentInput.focus();
    return;
  }
  if (content.length < 10) {
    showContactFieldError('content', '详细内容至少需要10个字符');
    contentInput.focus();
    return;
  }
  clearContactFieldError('content');
  
  // 所有验证通过，准备提交
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  
  // 清理手机号格式（使用E.164格式）
  if (data.phone && contactPhoneInputInstance) {
    // 使用 intl-tel-input 获取标准E.164格式
    const fullNumber = contactPhoneInputInstance.getNumber();
    if (fullNumber) {
      data.phone = fullNumber; // E.164格式，如 +8613800138000
    }
  }
  
// 显示联系表单字段错误
function showContactFieldError(fieldName, message) {
  const errorElement = document.getElementById(`contact-${fieldName}-error`);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    errorElement.setAttribute('aria-live', 'polite');
  }
  
  // 更新输入框状态
  const inputElement = document.getElementById(`contact-${fieldName}`);
  if (inputElement) {
    inputElement.classList.add('input-error');
    inputElement.setAttribute('aria-invalid', 'true');
  }
}

// 清除联系表单字段错误
function clearContactFieldError(fieldName) {
  const errorElement = document.getElementById(`contact-${fieldName}-error`);
  if (errorElement) {
    errorElement.classList.add('hidden');
    errorElement.textContent = '';
  }
  
  // 更新输入框状态
  const inputElement = document.getElementById(`contact-${fieldName}`);
  if (inputElement) {
    inputElement.classList.remove('input-error');
    inputElement.setAttribute('aria-invalid', 'false');
  }
}

  fetch('/parking/contact/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': window.getCsrfToken ? window.getCsrfToken() : ''
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      alert('感谢您的反馈！我们会尽快处理。');
      form.reset();
      hideEmailForm();
    } else {
      alert('提交失败：' + result.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
    alert('提交失败，请稍后重试');
  });
}

async function showOnDutyStaff() {
  try {
    const response = await fetch('/parking/api/on-duty-staff/');
    const result = await response.json();
    
    if (result.success && result.data.staff.length > 0) {
      const staff = result.data.staff;
      let staffInfo = `当前在岗工作人员（${result.data.parking_lot}）：\n\n`;
      staff.forEach((s, index) => {
        staffInfo += `${index + 1}. ${s.name} (${s.username})\n`;
        if (s.phone) staffInfo += `   电话：${s.phone}\n`;
        if (s.email) staffInfo += `   邮箱：${s.email}\n`;
        staffInfo += `   工作时间：${s.start_time} - ${s.end_time}\n\n`;
      });
      alert(staffInfo);
    } else {
      alert('当前暂无在岗工作人员');
    }
  } catch (error) {
    console.error('查询在岗工作人员失败:', error);
    alert('查询失败，请稍后重试');
  }
}

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}