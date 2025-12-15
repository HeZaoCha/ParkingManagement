"""
分析慢查询日志

Django管理命令，用于分析数据库慢查询
"""

from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings
from collections import defaultdict


class Command(BaseCommand):
    help = "分析数据库慢查询日志"

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=10, help="显示最慢的N个查询（默认：10）")
        parser.add_argument(
            "--min-time",
            type=float,
            default=0.1,
            help="最小查询时间（秒），低于此时间的查询不显示（默认：0.1）",
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        min_time = options["min_time"]

        self.stdout.write(self.style.SUCCESS("开始分析数据库查询..."))

        # 获取查询日志
        queries = connection.queries if settings.DEBUG else []

        if not queries:
            self.stdout.write(self.style.WARNING("未找到查询日志。请确保DEBUG=True。"))
            return

        # 分析查询
        query_stats = defaultdict(lambda: {"count": 0, "total_time": 0, "queries": []})

        for query in queries:
            sql = query["sql"]
            time = float(query["time"])

            if time < min_time:
                continue

            # 简化SQL（移除参数值）
            simplified_sql = self.simplify_sql(sql)

            query_stats[simplified_sql]["count"] += 1
            query_stats[simplified_sql]["total_time"] += time
            query_stats[simplified_sql]["queries"].append({"sql": sql, "time": time})

        # 排序并显示
        sorted_queries = sorted(
            query_stats.items(), key=lambda x: x[1]["total_time"], reverse=True
        )[:limit]

        self.stdout.write(self.style.SUCCESS(f"\n最慢的 {len(sorted_queries)} 个查询：\n"))

        for i, (sql, stats) in enumerate(sorted_queries, 1):
            avg_time = stats["total_time"] / stats["count"]
            self.stdout.write(
                self.style.WARNING(
                    f"\n{i}. 执行次数: {stats['count']}, "
                    f"总时间: {stats['total_time']:.3f}s, "
                    f"平均时间: {avg_time:.3f}s"
                )
            )
            self.stdout.write(f"SQL: {sql[:200]}..." if len(sql) > 200 else f"SQL: {sql}")

        # 生成建议
        self.stdout.write(self.style.SUCCESS("\n\n优化建议："))
        self.generate_suggestions(sorted_queries)

    def simplify_sql(self, sql):
        """简化SQL，移除参数值"""
        import re

        # 移除字符串值
        sql = re.sub(r"'[^']*'", "?", sql)
        # 移除数字值
        sql = re.sub(r"\b\d+\b", "?", sql)
        # 标准化空白
        sql = " ".join(sql.split())
        return sql

    def generate_suggestions(self, queries):
        """生成优化建议"""
        suggestions = []

        for sql, stats in queries:
            sql_lower = sql.lower()

            # 检查是否缺少索引
            if "where" in sql_lower and "join" not in sql_lower:
                suggestions.append("考虑为WHERE子句中的列添加索引")

            # 检查N+1查询
            if stats["count"] > 10:
                suggestions.append("可能存在N+1查询问题，考虑使用select_related或prefetch_related")

            # 检查全表扫描
            if "where" not in sql_lower and "limit" not in sql_lower:
                suggestions.append("查询可能进行全表扫描，考虑添加WHERE条件或LIMIT")

        if suggestions:
            for suggestion in set(suggestions):
                self.stdout.write(f"  - {suggestion}")
        else:
            self.stdout.write("  未发现明显的优化点")
