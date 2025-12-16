// 当前步骤
let currentStep = 1;
const totalSteps = 3;

// 初始化国际手机号输入组件
let phoneInputInstance = null;

// 步骤切换函数
function showStep(step) {
  // 隐藏所有步骤内容
  document.querySelectorAll('.step-content').forEach(content => {
    content.classList.remove('active');
  });
  
  // 显示当前步骤
  const stepContent = document.getElementById(`step-${step}`);
  if (stepContent) {
    stepContent.classList.add('active');
  }
  
  // 更新步骤指示器
  document.querySelectorAll('.step-item').forEach((item, index) => {
    const stepNum = index + 1;
    item.classList.remove('active', 'completed');
    
    if (stepNum < step) {
      item.classList.add('completed');
    } else if (stepNum === step) {
      item.classList.add('active');
    }
  });
  
  currentStep = step;
}

function nextStep() {
  // 验证当前步骤
  if (currentStep === 1) {
    if (!validateStep1()) {
      return;
    }
  } else if (currentStep === 2) {
    if (!validateStep2()) {
      return;
    }
  }
  
  if (currentStep < totalSteps) {
    showStep(currentStep + 1);
  }
}

function prevStep() {
  if (currentStep > 1) {
    showStep(currentStep - 1);
  }
}

// 验证步骤1
function validateStep1() {
  const usernameInput = document.getElementById('username-input');
  const username = usernameInput.value.trim();
  
  if (!username) {
    showFieldError('username', '请输入用户名');
    usernameInput.focus();
    return false;
  }
  
  if (username.length < 3 || username.length > 20) {
    showFieldError('username', '用户名长度必须在3-20个字符之间');
    usernameInput.focus();
    return false;
  }
  
  // 检查用户名是否可用（异步，这里只做基本验证）
  clearFieldError('username');
  return true;
}

// 验证步骤2
function validateStep2() {
  const codeType = document.querySelector('input[name="code_type"]:checked')?.value;
  
  if (!codeType) {
    alert('请选择验证方式');
    return false;
  }
  
  if (codeType === 'email') {
    const emailInput = document.getElementById('email-input');
    const email = emailInput.value.trim();
    
    if (!email) {
      showFieldError('email', '请输入邮箱地址');
      emailInput.focus();
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showFieldError('email', '邮箱格式不正确');
      emailInput.focus();
      return false;
    }
    
    clearFieldError('email');
  } else if (codeType === 'phone') {
    const validation = validatePhoneNumber();
    if (!validation.valid) {
      showFieldError('phone', validation.message);
      const phoneInput = document.getElementById('phone-input');
      if (phoneInput) {
        phoneInput.focus();
        updatePhoneValidation(phoneInput);
      }
      return false;
    }
    clearFieldError('phone');
  }
  
  // 验证验证码
  const codeInput = document.getElementById('verification-code-input');
  const code = codeInput.value.trim();
  
  if (!code) {
    showFieldError('verification-code', '请输入验证码');
    codeInput.focus();
    return false;
  }
  
  if (!/^\d{6}$/.test(code)) {
    showFieldError('verification-code', '验证码必须是6位数字');
    codeInput.focus();
    return false;
  }
  
  clearFieldError('verification-code');
  return true;
}

// 初始化函数（在DOMContentLoaded中调用）
function initPhoneInput() {
  const phoneInput = document.getElementById('phone-input');
  
  if (phoneInput) {
    phoneInputInstance = window.intlTelInput(phoneInput, {
      initialCountry: 'cn',
      preferredCountries: ['cn', 'us', 'hk', 'tw', 'jp', 'kr', 'sg'],
      nationalMode: true, // 使用国家格式（输入框内不显示区号）
      formatAsYouType: true,
      autoPlaceholder: 'polite',
      placeholderNumberType: 'MOBILE',
      countrySearch: true,
      showSelectedDialCode: true, // 在国旗区域显示区号
      separateDialCode: true, // 将区号单独显示在国旗区域
      strictMode: true,
      loadUtils: () => import('https://cdn.jsdelivr.net/npm/intl-tel-input@25.13.1/build/js/utils.js'),
      containerClass: 'w-full',
      geoIpLookup: function(callback) {
        callback('cn');
      }
    });
    
    phoneInput.addEventListener('countrychange', function() {
      // 当使用 separateDialCode 时，区号会自动显示在国旗区域，输入框内只需要输入数字
      updatePhoneValidation(phoneInput);
    });
  }
}

// 验证手机号格式
function validatePhoneNumber() {
  const phoneInput = document.getElementById('phone-input');
  if (!phoneInput || !phoneInputInstance) {
    return { valid: false, message: '手机号输入框未初始化' };
  }
  
  const value = phoneInput.value.trim();
  
  if (!value) {
    return { valid: false, message: '请输入手机号' };
  }
  
  if (phoneInputInstance.isValidNumber()) {
    const fullNumber = phoneInputInstance.getNumber();
    return { valid: true, cleaned: fullNumber, isInternational: true };
  } else {
    const errorCode = phoneInputInstance.getValidationError();
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

// 更新手机号输入框验证状态
function updatePhoneValidation(phoneInput) {
  if (!phoneInputInstance) return;
  
  const errorDiv = document.getElementById('phone-error');
  const validationIcon = document.getElementById('phone-validation-icon');
  const validIcon = document.getElementById('phone-valid-icon');
  const invalidIcon = document.getElementById('phone-invalid-icon');
  
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

// 初始化字段显示状态
function updateFieldVisibility() {
  const emailField = document.getElementById('email-field');
  const phoneField = document.getElementById('phone-field');
  const selectedCodeType = document.querySelector('input[name="code_type"]:checked');
  
  if (!emailField || !phoneField) return;
  
  if (selectedCodeType) {
    if (selectedCodeType.value === 'email') {
      emailField.classList.remove('hidden');
      phoneField.classList.add('hidden');
    } else {
      emailField.classList.add('hidden');
      phoneField.classList.remove('hidden');
    }
  } else {
    const emailRadio = document.querySelector('input[name="code_type"][value="email"]');
    if (emailRadio) {
      emailRadio.checked = true;
      emailField.classList.remove('hidden');
      phoneField.classList.add('hidden');
    }
  }
}

// 用户名验证和重复检查
let usernameCheckTimeout = null;

function validateUsernameLength(username) {
  const length = username.length;
  if (length < 3) {
    return { valid: false, message: '用户名至少需要3个字符' };
  }
  if (length > 20) {
    return { valid: false, message: '用户名不能超过20个字符' };
  }
  return { valid: true, message: '' };
}

async function checkUsernameAvailability(username) {
  if (!username || username.length < 3) {
    return { available: false, message: '用户名至少需要3个字符' };
  }
  
  // 从表单的 data 属性获取 API URL
  const form = document.getElementById('register-form');
  const checkUsernameUrl = form?.dataset.checkUsernameUrl || '';
  
  try {
    const response = await fetch(`${checkUsernameUrl}?username=${encodeURIComponent(username)}`);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('检查用户名失败:', error);
    return { available: false, message: '检查用户名时出错，请稍后重试' };
  }
}

function updateUsernameValidation(usernameInput) {
  const errorDiv = document.getElementById('username-error');
  const validationIcon = document.getElementById('username-validation-icon');
  const validIcon = document.getElementById('username-valid-icon');
  const invalidIcon = document.getElementById('username-invalid-icon');
  
  const value = usernameInput.value.trim();
  
  errorDiv.classList.add('hidden');
  validationIcon.classList.add('hidden');
  usernameInput.setAttribute('aria-invalid', 'false');
  usernameInput.classList.remove('border-red-500', 'border-green-500');
  
  if (!value) {
    return;
  }
  
  const lengthValidation = validateUsernameLength(value);
  if (!lengthValidation.valid) {
    errorDiv.textContent = lengthValidation.message;
    errorDiv.classList.remove('hidden');
    validationIcon.classList.remove('hidden');
    invalidIcon.classList.remove('hidden');
    validIcon.classList.add('hidden');
    usernameInput.setAttribute('aria-invalid', 'true');
    usernameInput.classList.add('border-red-500');
    return;
  }
  
  checkUsernameAvailability(value).then(result => {
    if (result.available) {
      errorDiv.classList.add('hidden');
      validationIcon.classList.remove('hidden');
      validIcon.classList.remove('hidden');
      invalidIcon.classList.add('hidden');
      usernameInput.setAttribute('aria-invalid', 'false');
      usernameInput.classList.remove('border-red-500');
      usernameInput.classList.add('border-green-500');
    } else {
      errorDiv.textContent = result.message;
      errorDiv.classList.remove('hidden');
      validationIcon.classList.remove('hidden');
      invalidIcon.classList.remove('hidden');
      validIcon.classList.add('hidden');
      usernameInput.setAttribute('aria-invalid', 'true');
      usernameInput.classList.remove('border-green-500');
      usernameInput.classList.add('border-red-500');
    }
  });
}

// 显示字段错误
function showFieldError(fieldName, message) {
  const errorElement = document.getElementById(`${fieldName}-error`);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.remove('hidden');
    errorElement.setAttribute('aria-live', 'polite');
  }
  
  const inputElement = document.getElementById(`${fieldName}-input`) || 
                       document.querySelector(`[name="${fieldName}"]`) ||
                       document.getElementById(`verification-code-input`);
  if (inputElement) {
    inputElement.classList.add('input-error');
    inputElement.setAttribute('aria-invalid', 'true');
  }
}

// 清除字段错误
function clearFieldError(fieldName) {
  const errorElement = document.getElementById(`${fieldName}-error`);
  if (errorElement) {
    errorElement.classList.add('hidden');
    errorElement.textContent = '';
  }
  
  const inputElement = document.getElementById(`${fieldName}-input`) || 
                       document.querySelector(`[name="${fieldName}"]`) ||
                       document.getElementById(`verification-code-input`);
  if (inputElement) {
    inputElement.classList.remove('input-error');
    inputElement.setAttribute('aria-invalid', 'false');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  initPhoneInput();
  
  const codeTypeRadios = document.querySelectorAll('input[name="code_type"]');
  const phoneInput = document.getElementById('phone-input');
  const usernameInput = document.getElementById('username-input');
  
  updateFieldVisibility();
  
  if (usernameInput) {
    usernameInput.addEventListener('input', function(e) {
      const value = e.target.value;
      if (value.length > 20) {
        e.target.value = value.slice(0, 20);
      }
      
      clearTimeout(usernameCheckTimeout);
      usernameCheckTimeout = setTimeout(() => {
        updateUsernameValidation(usernameInput);
      }, 500);
    });
    
    usernameInput.addEventListener('blur', function() {
      clearTimeout(usernameCheckTimeout);
      updateUsernameValidation(usernameInput);
    });
  }
  
  if (phoneInput && phoneInputInstance) {
    phoneInput.addEventListener('input', function() {
      clearTimeout(phoneInput.validationTimeout);
      phoneInput.validationTimeout = setTimeout(() => {
        updatePhoneValidation(phoneInput);
      }, 300);
    });
    
    phoneInput.addEventListener('blur', function() {
      updatePhoneValidation(phoneInput);
    });
  }
  
  codeTypeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      updateFieldVisibility();
      if (this.value === 'phone' && phoneInput) {
        setTimeout(() => phoneInput.focus(), 100);
      }
    });
  });
  
  // 表单提交处理
  const form = document.getElementById('register-form');
  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // 验证所有步骤
    if (!validateStep1() || !validateStep2()) {
      // 如果验证失败，跳转到失败的步骤
      if (!validateStep1()) {
        showStep(1);
      } else if (!validateStep2()) {
        showStep(2);
      }
      return;
    }
    
    // 验证密码
    const passwordInput = document.getElementById('password-input');
    const password = passwordInput.value;
    if (!password) {
      showFieldError('password', '请输入密码');
      showStep(3);
      passwordInput.focus();
      return;
    }
    if (password.length < 8 || password.length > 128) {
      showFieldError('password', '密码长度必须在8-128个字符之间');
      showStep(3);
      passwordInput.focus();
      return;
    }
    clearFieldError('password');
    
    const confirmInput = document.getElementById('password-confirm-input');
    const confirmPassword = confirmInput.value;
    if (!confirmPassword) {
      showFieldError('password-confirm', '请再次输入密码');
      showStep(3);
      confirmInput.focus();
      return;
    }
    if (password !== confirmPassword) {
      showFieldError('password-confirm', '两次输入的密码不一致');
      showStep(3);
      confirmInput.focus();
      return;
    }
    clearFieldError('password-confirm');
    
    // 所有验证通过，准备提交
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const codeType = document.querySelector('input[name="code_type"]:checked')?.value;
    if (codeType === 'phone' && data.phone && phoneInputInstance) {
      const fullNumber = phoneInputInstance.getNumber();
      if (fullNumber) {
        data.phone = fullNumber;
      }
    }
    
    // 从表单的 data 属性获取注册 URL
    const form = document.getElementById('register-form');
    const registerUrl = form?.dataset.registerUrl || '';
    
    try {
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.getCsrfToken()
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      if (result.success) {
        alert('注册成功！');
        window.location.href = result.redirect_url || '/parking/customer/';
      } else {
        alert('注册失败：' + result.message);
      }
    } catch (error) {
      alert('注册失败，请稍后重试');
    }
  });
});

async function sendVerificationCode() {
  const codeType = document.querySelector('input[name="code_type"]:checked').value;
  let target;
  
  if (codeType === 'email') {
    target = document.getElementById('email-input').value;
    if (!target) {
      alert('请先输入邮箱');
      return;
    }
  } else {
    const phoneInput = document.getElementById('phone-input');
    
    if (!phoneInput || !phoneInput.value.trim()) {
      alert('请先输入手机号');
      if (phoneInput) phoneInput.focus();
      return;
    }
    
    const validation = validatePhoneNumber();
    if (!validation.valid) {
      alert(validation.message);
      phoneInput.focus();
      updatePhoneValidation(phoneInput);
      return;
    }
    
    if (phoneInputInstance) {
      target = phoneInputInstance.getNumber();
    } else {
      alert('手机号输入组件未初始化，请刷新页面重试');
      return;
    }
  }
  
  const btn = codeType === 'email' 
    ? document.getElementById('send-code-btn')
    : document.getElementById('send-code-btn-phone');
  
  btn.disabled = true;
  btn.textContent = '发送中...';
  
  // 从表单的 data 属性获取发送验证码 URL
  const form = document.getElementById('register-form');
  const sendCodeUrl = form?.dataset.sendCodeUrl || '';
  
  try {
    const response = await fetch(sendCodeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': window.getCsrfToken()
      },
      body: JSON.stringify({
        code_type: codeType,
        target: target,
        purpose: 'register'
      })
    });
    
    const result = await response.json();
    
    if (response.status === 429 || (result.message && result.message.includes('频繁'))) {
      alert('发送过于频繁，请1分钟后再试');
      let countdown = 60;
      btn.textContent = `${countdown}秒后重发`;
      const timer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          btn.textContent = `${countdown}秒后重发`;
        } else {
          clearInterval(timer);
          btn.disabled = false;
          btn.textContent = '发送验证码';
        }
      }, 1000);
      return;
    }
    
    if (result.success) {
      alert('验证码已发送！');
      let countdown = 60;
      btn.textContent = `${countdown}秒后重发`;
      const timer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
          btn.textContent = `${countdown}秒后重发`;
        } else {
          clearInterval(timer);
          btn.disabled = false;
          btn.textContent = '发送验证码';
        }
      }, 1000);
    } else {
      alert('发送失败：' + (result.message || '未知错误'));
      btn.disabled = false;
      btn.textContent = '发送验证码';
    }
  } catch (error) {
    console.error('发送验证码错误:', error);
    alert('发送失败，请稍后重试');
    btn.disabled = false;
    btn.textContent = '发送验证码';
  }
}

// getCookie 函数已由 utils.js 中的 getCsrfToken 替代