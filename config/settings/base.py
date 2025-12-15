"""
Django settings - 基础配置

所有环境共享的配置项

Author: HeZaoCha
Created: 2025-12-12
Version: 1.1.0
"""

import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent


# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # 开发工具
    "django_extensions",
    # 通用模块（必须最先加载）
    "apps.common",
    "apps.infrastructure",
    # 核心业务模块
    "parking",
    # 功能扩展模块
    "apps.audit",
    "apps.config",
    "apps.notifications",
    "apps.reports",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",  # 多语言支持
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # 自定义中间件（从core.middleware导入）
    "core.middleware.middleware.RequestLoggingMiddleware",
    "core.middleware.middleware.PerformanceMonitoringMiddleware",
    "apps.audit.middleware.AuditLogMiddleware",
    # 停车场应用中间件
    "parking.middleware.SessionExpiryMiddleware",
    "parking.middleware.PermissionCheckMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# 登录相关配置
LOGIN_URL = "/login/"
LOGIN_REDIRECT_URL = "/parking/dashboard/"
LOGOUT_REDIRECT_URL = "/login/"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
LANGUAGE_CODE = "zh-hans"
TIME_ZONE = "Asia/Shanghai"
USE_I18N = True
USE_L10N = True
USE_TZ = True

# 支持的语言
LANGUAGES = [
    ("zh-hans", "简体中文"),
    ("en", "English"),
]

# 语言文件路径
LOCALE_PATHS = [
    BASE_DIR / "locale",
]

# Static files (CSS, JavaScript, Images)
STATIC_URL = "static/"
STATICFILES_DIRS = [BASE_DIR / "static"]
STATIC_ROOT = BASE_DIR / "staticfiles"  # 静态文件收集目录

# 静态文件查找器
STATICFILES_FINDERS = [
    "django.contrib.staticfiles.finders.FileSystemFinder",
    "django.contrib.staticfiles.finders.AppDirectoriesFinder",
]

# Media files
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Session 配置
SESSION_COOKIE_AGE = 3600 * 2  # 2小时过期
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"

# CSRF Token 配置
CSRF_COOKIE_AGE = 3600 * 2
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = "Lax"

# 验证码配置
VERIFICATION_CODE_EXPIRE_MINUTES = 10
VERIFICATION_CODE_LENGTH = 6

# 邮件配置（基础配置，具体值在环境配置中设置）
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.qq.com"
EMAIL_PORT = 465
EMAIL_USE_SSL = True
EMAIL_USE_TLS = False

# 日志配置 - 使用 loguru
# loguru 配置在 apps/infrastructure/apps.py 中初始化
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# 缓存配置（基础配置，各环境可覆盖）
# 开发环境使用内存缓存，生产环境使用Redis
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "unique-snowflake",
        "OPTIONS": {
            "MAX_ENTRIES": 1000,
        },
        "KEY_PREFIX": "parking_management",
        "TIMEOUT": 300,  # 默认5分钟
    }
}

# Celery配置
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://127.0.0.1:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "Asia/Shanghai"
CELERY_ENABLE_UTC = True
