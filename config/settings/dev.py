"""
Django settings - 开发环境配置

Author: HeZaoCha
Created: 2025-12-12
Version: 1.1.0
"""

import os
from .base import *

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get(
    'SECRET_KEY',
    'django-insecure-dg5uywwiqf_xth*97w$oib=49no=2&onr1k23=2)xc+&*%1qjf'
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

# HTTPS/SSL 配置（开发环境）
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
        # SQLite不支持连接池，但保留配置以便迁移到PostgreSQL
        'CONN_MAX_AGE': 0,  # 开发环境：每次请求后关闭连接
        'OPTIONS': {
            'timeout': 20,  # 查询超时（秒）
        },
    }
}

# 邮件配置（开发环境）
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'zaochahe@qq.com')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', 'iyqdcjjzlfqdieig')
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# 缓存配置（开发环境使用本地内存缓存）
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
        },
        'KEY_PREFIX': 'parking_management',
        'TIMEOUT': 300,  # 5分钟
    }
}

# 静态文件配置（开发环境）
# 开发环境不使用ManifestStaticFilesStorage，以便实时看到文件变化
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Django Debug Toolbar 配置（仅开发环境）
if DEBUG:
    try:
        import debug_toolbar
        INSTALLED_APPS += ['debug_toolbar']
        MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
        INTERNAL_IPS = ['127.0.0.1', 'localhost']
        
        # Debug Toolbar 配置
        DEBUG_TOOLBAR_CONFIG = {
            'SHOW_TOOLBAR_CALLBACK': lambda request: DEBUG,
            'DISABLE_PANELS': {
                'debug_toolbar.panels.redirects.RedirectsPanel',
            },
        }
    except ImportError:
        # debug_toolbar 未安装，跳过配置
        pass
