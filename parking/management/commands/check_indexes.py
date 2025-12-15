"""
检查数据库索引

Django管理命令，用于检查缺失的索引
"""

from django.core.management.base import BaseCommand
from django.db import connection
from django.apps import apps


class Command(BaseCommand):
    help = "检查数据库索引，识别可能缺失的索引"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("开始检查数据库索引...\n"))

        # 获取所有模型
        models = apps.get_models()

        missing_indexes = []

        for model in models:
            # 检查ForeignKey字段
            for field in model._meta.get_fields():
                if field.many_to_one and field.related_model:
                    # 检查是否有索引
                    if not self.has_index(model, field.name):
                        missing_indexes.append(
                            {
                                "model": model.__name__,
                                "field": field.name,
                                "type": "ForeignKey",
                                "reason": "外键字段通常需要索引以提高JOIN性能",
                            }
                        )

                # 检查经常用于WHERE的字段
                if hasattr(field, "db_index") and not field.db_index:
                    # 检查字段名是否暗示需要索引
                    if any(
                        keyword in field.name.lower()
                        for keyword in ["status", "type", "date", "created", "updated"]
                    ):
                        missing_indexes.append(
                            {
                                "model": model.__name__,
                                "field": field.name,
                                "type": field.__class__.__name__,
                                "reason": "该字段可能经常用于查询过滤",
                            }
                        )

        if missing_indexes:
            self.stdout.write(
                self.style.WARNING(f"\n发现 {len(missing_indexes)} 个可能缺失的索引：\n")
            )
            for idx in missing_indexes:
                self.stdout.write(
                    f"模型: {idx['model']}, "
                    f"字段: {idx['field']}, "
                    f"类型: {idx['type']}\n"
                    f"  原因: {idx['reason']}\n"
                )
        else:
            self.stdout.write(self.style.SUCCESS("未发现明显缺失的索引"))

        # 显示现有索引
        self.stdout.write(self.style.SUCCESS("\n现有索引统计："))
        self.show_index_stats()

    def has_index(self, model, field_name):
        """检查字段是否有索引"""

        table_name = model._meta.db_table
        field = model._meta.get_field(field_name)
        column_name = field.column

        with connection.cursor() as cursor:
            if connection.vendor == "postgresql":
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM pg_indexes
                    WHERE tablename = %s
                    AND indexdef LIKE %s
                """,
                    [table_name, f"%{column_name}%"],
                )
            elif connection.vendor == "sqlite":
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM sqlite_master
                    WHERE type = 'index'
                    AND tbl_name = %s
                    AND sql LIKE %s
                """,
                    [table_name, f"%{column_name}%"],
                )
            else:
                return False

            return cursor.fetchone()[0] > 0

    def show_index_stats(self):
        """显示索引统计"""

        with connection.cursor() as cursor:
            if connection.vendor == "postgresql":
                cursor.execute("""
                    SELECT schemaname, tablename, COUNT(*) as index_count
                    FROM pg_indexes
                    WHERE schemaname = 'public'
                    GROUP BY schemaname, tablename
                    ORDER BY index_count DESC
                    LIMIT 10
                """)
                results = cursor.fetchall()
                for schema, table, count in results:
                    self.stdout.write(f"  {table}: {count} 个索引")
            elif connection.vendor == "sqlite":
                cursor.execute("""
                    SELECT tbl_name, COUNT(*) as index_count
                    FROM sqlite_master
                    WHERE type = 'index'
                    AND tbl_name NOT LIKE 'sqlite_%'
                    GROUP BY tbl_name
                    ORDER BY index_count DESC
                    LIMIT 10
                """)
                results = cursor.fetchall()
                for table, count in results:
                    self.stdout.write(f"  {table}: {count} 个索引")
