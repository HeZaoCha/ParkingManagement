"""
联系功能视图

提供用户反馈、联系工作人员/管理员等功能。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.1.0
"""

import json

from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from loguru import logger

from parking.decorators import staff_member_required
from parking.email_service import EmailService
from parking.models import ParkingLot
from parking.user_models import ContactMessage, StaffSchedule


@require_http_methods(["GET", "POST"])
@csrf_exempt  # 允许未登录用户提交反馈
def contact_form(request):
    """联系我们表单页面"""
    if request.method == "GET":
        return render(request, "contact/form.html")

    # 简单的频率限制（基于IP，防止滥用）
    from django.core.cache import cache

    # 获取客户端IP
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        client_ip = x_forwarded_for.split(",")[0]
    else:
        client_ip = request.META.get("REMOTE_ADDR", "unknown")

    # 检查频率限制（同一IP 1分钟内最多提交3次）
    cache_key = f"contact_form_rate_limit:{client_ip}"
    submit_count = cache.get(cache_key, 0)
    if submit_count >= 3:
        return JsonResponse({"success": False, "message": "提交过于频繁，请稍后再试"}, status=429)

    try:
        data = (
            json.loads(request.body) if request.content_type == "application/json" else request.POST
        )

        name = data.get("name", "").strip()
        email = data.get("email", "").strip()
        phone = data.get("phone", "").strip()
        message_type = data.get("message_type", "feedback")
        subject = data.get("subject", "").strip()
        content = data.get("content", "").strip()

        # 验证必填字段
        if not name or not email or not subject or not content:
            return JsonResponse({"success": False, "message": "请填写所有必填字段"}, status=400)

        # 验证邮箱格式
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError

        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({"success": False, "message": "邮箱格式不正确"}, status=400)

        # 创建联系消息
        message = ContactMessage.objects.create(
            name=name,
            email=email,
            phone=phone,
            message_type=message_type,
            subject=subject,
            content=content,
            status="pending",
        )

        # 发送通知给管理员
        # 优化：使用select_related预加载profile
        admin_users = (
            User.objects.filter(groups__name="Admin", is_active=True)
            .exclude(email="")
            .select_related("profile")
        )

        for admin in admin_users:
            try:
                EmailService.send_contact_notification(admin.email, message)
            except Exception as e:
                logger.error(f"发送联系消息通知失败: {admin.email}, {e}")

        logger.info(f"收到联系消息: {name} - {subject}")

        # 更新频率限制计数
        cache.set(cache_key, submit_count + 1, 60)  # 60秒过期

        return JsonResponse({"success": True, "message": "感谢您的反馈，我们会尽快处理！"})

    except Exception as e:
        logger.exception("提交联系消息失败")
        return JsonResponse({"success": False, "message": f"提交失败: {str(e)}"}, status=500)


@require_http_methods(["GET"])
def get_on_duty_staff(request):
    """获取当前在岗的工作人员"""
    parking_lot_id = request.GET.get("parking_lot_id")

    if not parking_lot_id:
        return JsonResponse({"success": False, "message": "请提供停车场ID"}, status=400)

    try:
        parking_lot = ParkingLot.objects.get(id=parking_lot_id)
    except ParkingLot.DoesNotExist:
        return JsonResponse({"success": False, "message": "停车场不存在"}, status=404)

    # 获取当前星期和时间
    now = timezone.now()
    weekday = now.weekday()  # 0=周一, 6=周日
    current_time = now.time()

    # 查询当前在岗的工作人员
    schedules = StaffSchedule.objects.filter(
        parking_lot=parking_lot,
        weekday=weekday,
        is_active=True,
        start_time__lte=current_time,
        end_time__gte=current_time,
    ).select_related("user", "user__profile")

    staff_list = []
    for schedule in schedules:
        profile = getattr(schedule.user, "profile", None)
        staff_list.append(
            {
                "username": schedule.user.username,
                "name": schedule.user.get_full_name() or schedule.user.username,
                "phone": profile.phone if profile else None,
                "email": schedule.user.email,
                "start_time": schedule.start_time.strftime("%H:%M"),
                "end_time": schedule.end_time.strftime("%H:%M"),
            }
        )

    return JsonResponse(
        {
            "success": True,
            "data": {
                "parking_lot": parking_lot.name,
                "staff": staff_list,
                "count": len(staff_list),
            },
        }
    )


@require_http_methods(["GET"])
def get_admin_contacts(request):
    """获取管理员联系方式"""
    # 优化：使用select_related预加载profile
    admin_users = (
        User.objects.filter(groups__name="Admin", is_active=True)
        .exclude(email="")
        .select_related("profile")
    )

    admin_list = []
    for admin in admin_users:
        profile = getattr(admin, "profile", None)
        admin_list.append(
            {
                "username": admin.username,
                "name": admin.get_full_name() or admin.username,
                "email": admin.email,
                "phone": profile.phone if profile else None,
            }
        )

    return JsonResponse({"success": True, "data": {"admins": admin_list, "count": len(admin_list)}})


@staff_member_required
@require_http_methods(["GET"])
def contact_message_list(request):
    """联系消息列表（管理员查看）"""
    # 优化：使用select_related预加载回复人信息
    messages = ContactMessage.objects.select_related("replied_by").all().order_by("-created_at")

    # 筛选
    status = request.GET.get("status")
    message_type = request.GET.get("message_type")

    if status:
        messages = messages.filter(status=status)
    if message_type:
        messages = messages.filter(message_type=message_type)

    context = {
        "messages": messages,
        "status_choices": ContactMessage.STATUS_CHOICES,
        "type_choices": ContactMessage.TYPE_CHOICES,
    }
    return render(request, "admin/contact/list.html", context)


@staff_member_required
@require_http_methods(["POST"])
def contact_message_reply(request, message_id):
    """回复联系消息"""
    try:
        message = ContactMessage.objects.get(id=message_id)
    except ContactMessage.DoesNotExist:
        return JsonResponse({"success": False, "message": "消息不存在"}, status=404)

    try:
        data = (
            json.loads(request.body) if request.content_type == "application/json" else request.POST
        )
        reply_content = data.get("reply", "").strip()

        if not reply_content:
            return JsonResponse({"success": False, "message": "回复内容不能为空"}, status=400)

        # 更新消息
        message.reply = reply_content
        message.replied_by = request.user
        message.replied_at = timezone.now()
        message.status = "resolved"
        message.save()

        # 发送回复邮件
        try:
            EmailService.send_contact_reply(
                email=message.email, contact_message=message, reply_content=reply_content
            )
        except Exception as e:
            logger.error(f"发送回复邮件失败: {message.email}, {e}")

        return JsonResponse({"success": True, "message": "回复成功"})

    except Exception as e:
        logger.exception("回复联系消息失败")
        return JsonResponse({"success": False, "message": f"回复失败: {str(e)}"}, status=500)
