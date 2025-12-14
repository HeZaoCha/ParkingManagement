"""
用户认证相关视图

包含注册、登录、验证码等功能。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.1.0
"""
import json
from typing import Optional

from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login
from django.contrib.auth.models import Group, User
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from loguru import logger

from parking.email_service import EmailService
from parking.forms import ForgotPasswordForm, RegisterForm, ResetPasswordForm, VerifyCodeForm
from parking.user_models import UserProfile, VerificationCode


@require_http_methods(['GET', 'POST'])
@csrf_exempt  # 注册接口使用JSON，需要豁免CSRF
def register_view(request):
    """用户注册视图"""
    if request.method == 'GET':
        return render(request, 'auth/register.html')
    
    try:
        data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
        form = RegisterForm(data)
        
        if not form.is_valid():
            return JsonResponse({
                'success': False,
                'message': form.errors.as_text(),
                'errors': form.errors
            }, status=400)
        
        # 验证验证码
        code_type = form.cleaned_data.get('code_type', 'email')
        target = form.cleaned_data.get('email') if code_type == 'email' else form.cleaned_data.get('phone')
        code = form.cleaned_data.get('verification_code')
        
        verification = VerificationCode.objects.filter(
            target=target,
            code_type=code_type,
            purpose='register',
            code=code,
            is_used=False
        ).order_by('-created_at').first()
        
        if not verification or not verification.is_valid():
            return JsonResponse({
                'success': False,
                'message': '验证码无效或已过期，请重新获取'
            }, status=400)
        
        # 创建用户
        username = form.cleaned_data['username']
        email = form.cleaned_data.get('email')
        phone = form.cleaned_data.get('phone')
        password = form.cleaned_data['password']
        
        if User.objects.filter(username=username).exists():
            return JsonResponse({
                'success': False,
                'message': '用户名已存在'
            }, status=400)
        
        if email and User.objects.filter(email=email).exists():
            return JsonResponse({
                'success': False,
                'message': '邮箱已被注册'
            }, status=400)
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        # 创建用户资料
        profile = UserProfile.objects.create(
            user=user,
            role='customer',
            phone=phone,
            email_verified=(code_type == 'email'),
            phone_verified=(code_type == 'phone')
        )
        
        # 添加到客户组
        try:
            customer_group = Group.objects.get(name='Customer')
            user.groups.add(customer_group)
        except Group.DoesNotExist:
            pass
        
        # 标记验证码已使用
        verification.verify()
        
        # 自动登录
        login(request, user)
        
        logger.info(f'用户注册成功: {username}')
        
        return JsonResponse({
            'success': True,
            'message': '注册成功',
            'redirect_url': '/parking/customer/'
        })
        
    except Exception as e:
        logger.exception('注册失败')
        return JsonResponse({
            'success': False,
            'message': f'注册失败: {str(e)}'
        }, status=500)


@require_http_methods(['POST'])
@csrf_exempt  # 验证码接口允许跨域
def send_verification_code(request):
    """发送验证码（邮件/手机）"""
    try:
        data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
        code_type = data.get('code_type', 'email')  # email 或 phone
        target = data.get('target')  # 邮箱或手机号
        purpose = data.get('purpose', 'register')  # register/login/reset_password
        
        if not target:
            return JsonResponse({
                'success': False,
                'message': '请提供邮箱或手机号'
            }, status=400)
        
        # 检查频率限制（1分钟内只能发送一次）
        recent_code = VerificationCode.objects.filter(
            target=target,
            code_type=code_type,
            purpose=purpose,
            created_at__gte=timezone.now() - timezone.timedelta(minutes=1)
        ).exists()
        
        if recent_code:
            return JsonResponse({
                'success': False,
                'message': '发送过于频繁，请稍后再试'
            }, status=429)
        
        # 创建验证码
        verification = VerificationCode.create_code(
            code_type=code_type,
            purpose=purpose,
            target=target
        )
        
        # 发送验证码
        if code_type == 'email':
            try:
                purpose_display = dict(VerificationCode.PURPOSE_CHOICES).get(purpose, purpose)
                success = EmailService.send_verification_code(
                    email=target,
                    code=verification.code,
                    purpose=purpose_display
                )
                if not success:
                    verification.delete()
                    return JsonResponse({
                        'success': False,
                        'message': '邮件发送失败，请检查邮箱地址或联系管理员'
                    }, status=500)
            except Exception as e:
                logger.exception(f'发送验证码邮件异常: {target}')
                verification.delete()
                return JsonResponse({
                    'success': False,
                    'message': f'邮件发送失败: {str(e)}'
                }, status=500)
        elif code_type == 'phone':
            # 模拟手机验证码发送（实际需要接入短信服务）
            logger.info(f'[模拟] 手机验证码发送到 {target}: {verification.code}')
            # TODO (P2 - 可选): 接入真实短信服务
            # 当前使用模拟短信服务，功能可用。如需接入真实短信服务，请：
            # 1. 选择短信服务提供商（如阿里云、腾讯云、华为云等）
            # 2. 创建 SmsService 类实现 send_verification_code 方法
            # 3. 在 settings.py 中配置短信服务相关参数
            # 4. 替换此处的模拟代码为真实服务调用
            # success = SmsService.send_verification_code(phone=target, code=verification.code)
        
        # 获取验证码类型显示名称
        type_display = dict(VerificationCode.TYPE_CHOICES).get(code_type, '邮箱' if code_type == 'email' else '手机')
        
        return JsonResponse({
            'success': True,
            'message': f'验证码已发送到您的{type_display}',
            'expire_minutes': settings.VERIFICATION_CODE_EXPIRE_MINUTES
        })
        
    except Exception as e:
        logger.exception('发送验证码失败')
        return JsonResponse({
            'success': False,
            'message': f'发送失败: {str(e)}'
        }, status=500)


@require_http_methods(['GET'])
def check_username(request):
    """检查用户名是否可用（用于前端实时验证）"""
    username = request.GET.get('username', '').strip()
    
    if not username:
        return JsonResponse({
            'available': False,
            'message': '用户名不能为空'
        })
    
    # 验证长度
    if len(username) < 3 or len(username) > 20:
        return JsonResponse({
            'available': False,
            'message': '用户名长度必须在3-20个字符之间'
        })
    
    # 检查是否包含控制字符
    if any(ord(c) < 32 and c not in '\t\n\r' for c in username):
        return JsonResponse({
            'available': False,
            'message': '用户名不能包含控制字符'
        })
    
    # 检查是否已存在
    if User.objects.filter(username=username).exists():
        return JsonResponse({
            'available': False,
            'message': '用户名已存在，请选择其他用户名'
        })
    
    return JsonResponse({
        'available': True,
        'message': '用户名可用'
    })


@require_http_methods(['POST'])
def verify_code(request):
    """验证验证码"""
    try:
        data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
        form = VerifyCodeForm(data)
        
        if not form.is_valid():
            return JsonResponse({
                'success': False,
                'message': form.errors.as_text()
            }, status=400)
        
        code_type = form.cleaned_data['code_type']
        target = form.cleaned_data['target']
        code = form.cleaned_data['code']
        purpose = form.cleaned_data.get('purpose', 'register')
        
        verification = VerificationCode.objects.filter(
            target=target,
            code_type=code_type,
            purpose=purpose,
            code=code,
            is_used=False
        ).order_by('-created_at').first()
        
        if not verification:
            return JsonResponse({
                'success': False,
                'message': '验证码错误'
            })
        
        if not verification.is_valid():
            return JsonResponse({
                'success': False,
                'message': '验证码已过期，请重新获取'
            })
        
        # 验证成功，但不立即标记为已使用（注册时再标记）
        return JsonResponse({
            'success': True,
            'message': '验证码正确'
        })
        
    except Exception as e:
        logger.exception('验证码验证失败')
        return JsonResponse({
            'success': False,
            'message': f'验证失败: {str(e)}'
        }, status=500)


@require_http_methods(['GET', 'POST'])
def forgot_password_view(request):
    """忘记密码视图（第一步：输入用户名或邮箱）"""
    if request.user.is_authenticated:
        return redirect('parking:dashboard')
    
    if request.method == 'GET':
        return render(request, 'auth/forgot_password.html')
    
    try:
        data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
        form = ForgotPasswordForm(data)
        
        if not form.is_valid():
            return JsonResponse({
                'success': False,
                'message': form.errors.as_text(),
                'errors': form.errors
            }, status=400)
        
        username_or_email = form.cleaned_data['username_or_email'].strip()
        
        # 查找用户（通过用户名或邮箱）
        user = None
        if '@' in username_or_email:
            # 邮箱查找
            try:
                user = User.objects.get(email=username_or_email, is_active=True)
            except User.DoesNotExist:
                pass
        else:
            # 用户名查找
            try:
                user = User.objects.get(username=username_or_email, is_active=True)
            except User.DoesNotExist:
                pass
        
        if not user:
            # 为了安全，不明确告知用户是否存在，但返回成功消息
            logger.info(f'忘记密码请求：用户不存在或未激活 - {username_or_email}')
            return JsonResponse({
                'success': True,
                'message': '如果该账户存在，验证码已发送到您的注册邮箱'
            })
        
        # 检查用户是否有邮箱
        if not user.email:
            return JsonResponse({
                'success': False,
                'message': '该账户未绑定邮箱，无法重置密码，请联系管理员'
            }, status=400)
        
        # 检查频率限制
        recent_code = VerificationCode.objects.filter(
            target=user.email,
            code_type='email',
            purpose='reset_password',
            created_at__gte=timezone.now() - timezone.timedelta(minutes=1)
        ).exists()
        
        if recent_code:
            return JsonResponse({
                'success': False,
                'message': '发送过于频繁，请稍后再试'
            }, status=429)
        
        # 创建验证码
        verification = VerificationCode.create_code(
            code_type='email',
            purpose='reset_password',
            target=user.email
        )
        
        # 发送验证码邮件
        try:
            success = EmailService.send_verification_code(
                email=user.email,
                code=verification.code,
                purpose='重置密码'
            )
            if not success:
                verification.delete()
                return JsonResponse({
                    'success': False,
                    'message': '邮件发送失败，请检查邮箱地址或联系管理员'
                }, status=500)
        except Exception as e:
            logger.exception(f'发送重置密码验证码邮件异常: {user.email}')
            verification.delete()
            return JsonResponse({
                'success': False,
                'message': f'邮件发送失败: {str(e)}'
            }, status=500)
        
        # 为了安全，不明确告知用户是否存在
        return JsonResponse({
            'success': True,
            'message': '如果该账户存在，验证码已发送到您的注册邮箱',
            'email': user.email[:3] + '***' + user.email[user.email.find('@'):] if user.email else None  # 部分隐藏邮箱
        })
        
    except Exception as e:
        logger.exception('忘记密码处理失败')
        return JsonResponse({
            'success': False,
            'message': f'处理失败: {str(e)}'
        }, status=500)


@require_http_methods(['GET', 'POST'])
def reset_password_view(request):
    """重置密码视图（第二步：验证码+新密码）"""
    if request.user.is_authenticated:
        return redirect('parking:dashboard')
    
    if request.method == 'GET':
        # 需要提供邮箱参数
        email = request.GET.get('email', '').strip()
        if not email:
            messages.error(request, '缺少必要参数')
            return redirect('parking:forgot_password')
        return render(request, 'auth/reset_password.html', {'email': email})
    
    try:
        data = json.loads(request.body) if request.content_type == 'application/json' else request.POST
        form = ResetPasswordForm(data)
        
        if not form.is_valid():
            return JsonResponse({
                'success': False,
                'message': form.errors.as_text(),
                'errors': form.errors
            }, status=400)
        
        email = data.get('email', '').strip()
        code = form.cleaned_data['code']
        new_password = form.cleaned_data['new_password']
        
        if not email:
            return JsonResponse({
                'success': False,
                'message': '缺少邮箱参数'
            }, status=400)
        
        # 查找用户
        try:
            user = User.objects.get(email=email, is_active=True)
        except User.DoesNotExist:
            return JsonResponse({
                'success': False,
                'message': '用户不存在或账户已被禁用'
            }, status=400)
        
        # 验证验证码
        verification = VerificationCode.objects.filter(
            target=email,
            code_type='email',
            purpose='reset_password',
            code=code,
            is_used=False
        ).order_by('-created_at').first()
        
        if not verification:
            return JsonResponse({
                'success': False,
                'message': '验证码错误'
            }, status=400)
        
        if not verification.is_valid():
            return JsonResponse({
                'success': False,
                'message': '验证码已过期，请重新获取'
            }, status=400)
        
        # 重置密码
        user.set_password(new_password)
        user.save()
        
        # 标记验证码已使用
        verification.verify()
        
        logger.info(f'用户 {user.username} 重置密码成功')
        
        return JsonResponse({
            'success': True,
            'message': '密码重置成功，请使用新密码登录',
            'redirect_url': '/login/'
        })
        
    except Exception as e:
        logger.exception('重置密码失败')
        return JsonResponse({
            'success': False,
            'message': f'重置失败: {str(e)}'
        }, status=500)

