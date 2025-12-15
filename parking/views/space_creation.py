"""
车位号批量创建视图

提供车位号的批量创建功能，支持文档上传、范围设定等方式。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.1.0
"""

from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods
from loguru import logger

from parking.decorators import staff_member_required
from parking.models import ParkingLot
from parking.space_creation_service import SpaceCreationService, SpaceNumberParser


@staff_member_required
@require_http_methods(["GET"])
def space_template_download(request):
    """下载车位号模板Excel"""
    template_content = SpaceNumberParser.generate_excel_template()

    response = HttpResponse(
        template_content,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = 'attachment; filename="车位号模板.xlsx"'
    return response


@staff_member_required
@require_http_methods(["POST"])
def space_create_from_range(request, lot_id):
    """从范围创建车位"""
    parking_lot = get_object_or_404(ParkingLot, id=lot_id)

    try:
        data = request.POST if request.POST else {}
        if request.content_type == "application/json":
            import json

            data = json.loads(request.body)

        start = data.get("start", "").strip()
        end = data.get("end", "").strip()
        space_type = data.get("space_type", "standard")
        floor = data.get("floor", "").strip() or None
        area = data.get("area", "").strip() or None

        if not start or not end:
            return JsonResponse({"success": False, "message": "请提供起始和结束车位号"}, status=400)

        created, skipped, created_list, skipped_list, success, message = (
            SpaceCreationService.create_spaces_from_range(
                parking_lot=parking_lot,
                start=start,
                end=end,
                space_type=space_type,
                floor=floor,
                area=area,
            )
        )

        if success:
            return JsonResponse(
                {
                    "success": True,
                    "message": message,
                    "count": created,
                    "skipped": skipped,
                    "created_list": created_list[:100],  # 最多返回100个
                    "skipped_list": skipped_list[:100],  # 最多返回100个
                    "has_more_created": len(created_list) > 100,
                    "has_more_skipped": len(skipped_list) > 100,
                }
            )
        else:
            return JsonResponse({"success": False, "message": message}, status=400)

    except Exception as e:
        logger.exception("从范围创建车位失败")
        return JsonResponse({"success": False, "message": f"创建失败: {str(e)}"}, status=500)


@staff_member_required
@require_http_methods(["POST"])
def space_create_from_file(request, lot_id):
    """从文件创建车位"""
    parking_lot = get_object_or_404(ParkingLot, id=lot_id)

    if "file" not in request.FILES:
        return JsonResponse({"success": False, "message": "请选择要上传的文件"}, status=400)

    file = request.FILES["file"]
    file_name = file.name.lower()

    # 确定文件类型
    if file_name.endswith(".xlsx") or file_name.endswith(".xls"):
        file_type = "xlsx"
    elif file_name.endswith(".txt"):
        file_type = "txt"
    elif file_name.endswith(".md"):
        file_type = "md"
    else:
        return JsonResponse(
            {"success": False, "message": "不支持的文件类型，请上传 .txt、.md 或 .xlsx 文件"},
            status=400,
        )

    try:
        file_content = file.read()
        created, skipped, created_list, skipped_list, failed_lines, success, message = (
            SpaceCreationService.create_spaces_from_file(
                parking_lot=parking_lot, file_content=file_content, file_type=file_type
            )
        )

        if success:
            return JsonResponse(
                {
                    "success": True,
                    "message": message,
                    "count": created,
                    "skipped": skipped,
                    "failed_count": len(failed_lines),
                    "created_list": created_list[:100],  # 最多返回100个
                    "skipped_list": skipped_list[:100],  # 最多返回100个
                    "failed_lines": failed_lines[:20],  # 最多返回20个失败行
                    "has_more_created": len(created_list) > 100,
                    "has_more_skipped": len(skipped_list) > 100,
                    "has_more_failed": len(failed_lines) > 20,
                }
            )
        else:
            return JsonResponse({"success": False, "message": message}, status=400)

    except Exception as e:
        logger.exception("从文件创建车位失败")
        return JsonResponse({"success": False, "message": f"创建失败: {str(e)}"}, status=500)
