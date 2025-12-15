"""
国际化视图

处理语言切换等功能
"""

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.utils.translation import activate


@require_POST
@csrf_exempt
def set_language(request):
    """
    设置用户语言偏好
    """
    language = request.POST.get("language", settings.LANGUAGE_CODE)

    # 验证语言是否支持
    supported_languages = [lang[0] for lang in settings.LANGUAGES]
    if language not in supported_languages:
        language = settings.LANGUAGE_CODE

    # 激活语言
    activate(language)

    # 设置session
    request.session["django_language"] = language

    return JsonResponse(
        {"success": True, "message": "Language switched successfully", "language": language}
    )
