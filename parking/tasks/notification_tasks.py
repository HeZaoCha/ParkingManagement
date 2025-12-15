"""
通知发送异步任务
"""

from celery import shared_task


@shared_task
def send_notification_async(user_id, message, notification_type="info"):
    """
    异步发送通知

    Args:
        user_id: 用户ID
        message: 通知消息
        notification_type: 通知类型
    """
    # TODO: 实现通知发送逻辑
    return {"status": "success", "user_id": user_id, "message": message}
