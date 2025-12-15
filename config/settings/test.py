"""
Django settings - 测试环境配置

Author: HeZaoCha
Created: 2025-12-12
Version: 1.1.0
"""

import os
from .base import *

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = "test-secret-key-for-testing-only"

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ["testserver"]

# Database（测试环境可以使用 PostgreSQL 或 SQLite）
# Docker 测试环境使用 PostgreSQL，本地测试可以使用 SQLite
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "parking_management_test"),
        "USER": os.environ.get("DB_USER", "postgres"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "postgres"),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
        "TEST": {
            "NAME": "test_parking_management",
        },
    }
}

# 如果没有 PostgreSQL，回退到 SQLite
if os.environ.get("USE_SQLITE_FOR_TEST", "").lower() == "true":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": ":memory:",
        }
    }

# 密码验证（测试环境可以简化）
AUTH_PASSWORD_VALIDATORS = []

# 缓存配置（测试环境使用DummyCache）
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.dummy.DummyCache",
    }
}

# 邮件配置（测试环境使用控制台后端）
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
EMAIL_HOST_USER = "test@example.com"  # 测试环境邮件配置
EMAIL_HOST_PASSWORD = "test_password"


# 禁用迁移（测试时）
class DisableMigrations:
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None


MIGRATION_MODULES = DisableMigrations()
