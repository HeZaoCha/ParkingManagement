"""
系统配置服务

提供配置的读取、设置和缓存服务。
"""

from typing import Any

from django.core.cache import cache

from apps.config.models import SystemConfig


class ConfigService:
    """系统配置服务类"""

    CACHE_TIMEOUT = 3600  # 缓存1小时

    @classmethod
    def get(cls, key: str, default: Any = None, use_cache: bool = True) -> Any:
        """
        获取配置值

        Args:
            key: 配置键
            default: 默认值（如果配置不存在）
            use_cache: 是否使用缓存

        Returns:
            Any: 配置值
        """
        cache_key = f"config:{key}"

        # 尝试从缓存获取
        if use_cache:
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value

        # 从数据库获取
        try:
            config = SystemConfig.objects.get(key=key)
            value = config.get_value()

            # 存入缓存
            if use_cache:
                cache.set(cache_key, value, cls.CACHE_TIMEOUT)

            return value
        except SystemConfig.DoesNotExist:
            return default

    @classmethod
    def set(
        cls,
        key: str,
        value: Any,
        config_type: str = "string",
        group: str = "general",
        description: str = "",
    ) -> SystemConfig:
        """
        设置配置值

        Args:
            key: 配置键
            value: 配置值
            config_type: 配置类型
            group: 配置分组
            description: 配置描述

        Returns:
            SystemConfig: 配置对象
        """
        config, created = SystemConfig.objects.get_or_create(
            key=key,
            defaults={"config_type": config_type, "group": group, "description": description},
        )

        config.set_value(value)
        config.save()

        return config

    @classmethod
    def get_group(cls, group: str, use_cache: bool = True) -> dict[str, Any]:
        """
        获取分组的所有配置

        Args:
            group: 配置分组
            use_cache: 是否使用缓存

        Returns:
            dict: 配置字典（key: value）
        """
        cache_key = f"config:group:{group}"

        # 尝试从缓存获取
        if use_cache:
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value

        # 从数据库获取
        configs = SystemConfig.objects.filter(group=group)
        result = {config.key: config.get_value() for config in configs}

        # 存入缓存
        if use_cache:
            cache.set(cache_key, result, cls.CACHE_TIMEOUT)

        return result

    @classmethod
    def get_public_configs(cls) -> dict[str, Any]:
        """
        获取所有公开配置（供前端使用）

        Returns:
            dict: 公开配置字典
        """
        cache_key = "config:public"

        # 尝试从缓存获取
        cached_value = cache.get(cache_key)
        if cached_value is not None:
            return cached_value

        # 从数据库获取
        configs = SystemConfig.objects.filter(is_public=True)
        result = {config.key: config.get_value() for config in configs}

        # 存入缓存
        cache.set(cache_key, result, cls.CACHE_TIMEOUT)

        return result
