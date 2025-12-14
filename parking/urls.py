"""
停车场管理应用URL配置

包含前台页面、客户端界面、API接口和自定义管理后台的路由。

Author: HeZaoCha
Created: 2024-12-09
Last Modified: 2025-12-11
Version: 1.1.0
"""
from django.urls import path

from .views import (
    admin, alert, api, auth_views, contact, customer,
    police, pricing, schedule, space_creation,
    auth as views_auth, dashboard as views_dashboard
)

app_name = 'parking'

urlpatterns = [
    # 前台页面（工作人员）
    path('', views_auth.home_view, name='home'),
    path('dashboard/', views_dashboard.dashboard_view, name='dashboard'),
    
    # 客户端界面（无需登录）
    path('customer/', customer.customer_index, name='customer_index'),
    
    # ==================== API 接口 ====================
    # 车辆入场/出场/查询
    path('api/entry/', api.api_vehicle_entry, name='api_entry'),
    path('api/exit/', api.api_vehicle_exit, name='api_exit'),
    path('api/query/', api.api_vehicle_query, name='api_query'),
    path('api/search/', api.api_search_records, name='api_search'),
    
    # 数据接口
    path('api/stats/', api.api_dashboard_stats, name='api_stats'),
    path('api/lots/', api.api_parking_lots, name='api_lots'),
    path('api/lots/<int:lot_id>/', api.api_parking_lot_detail, name='api_parking_lot_detail'),
    path('api/available-spaces/', api.api_available_spaces, name='api_available_spaces'),
    path('api/validate-plate/', api.api_validate_plate, name='api_validate_plate'),
    
    # ==================== 自定义管理后台 ====================
    path('manage/', admin.admin_index, name='admin_index'),
    
    # 停车场管理
    path('manage/lots/', admin.parking_lot_list, name='admin_parking_lot_list'),
    path('manage/lots/add/', admin.parking_lot_edit, name='admin_parking_lot_add'),
    path('manage/lots/<int:pk>/', admin.parking_lot_detail, name='admin_parking_lot_detail'),
    path('manage/lots/<int:pk>/edit/', admin.parking_lot_edit, name='admin_parking_lot_edit'),
    path('manage/lots/<int:pk>/delete/', admin.parking_lot_delete, name='admin_parking_lot_delete'),
    path('manage/lots/<int:pk>/toggle/', admin.parking_lot_toggle_status, name='admin_parking_lot_toggle'),
    path('manage/lots/<int:lot_id>/pricing/', pricing.parking_lot_pricing_edit, name='admin_parking_lot_pricing'),
    path('manage/lots/<int:lot_id>/spaces/create-range/', space_creation.space_create_from_range, name='admin_space_create_range'),
    path('manage/lots/<int:lot_id>/spaces/create-file/', space_creation.space_create_from_file, name='admin_space_create_file'),
    path('manage/lots/<int:lot_id>/spaces/template/', space_creation.space_template_download, name='admin_space_template'),
    
    # 车位管理
    path('manage/spaces/', admin.parking_space_list, name='admin_parking_space_list'),
    path('manage/spaces/add/', admin.parking_space_edit, name='admin_parking_space_add'),
    path('manage/spaces/<int:pk>/edit/', admin.parking_space_edit, name='admin_parking_space_edit'),
    path('manage/spaces/<int:pk>/delete/', admin.parking_space_delete, name='admin_parking_space_delete'),
    path('manage/spaces/batch-create/', admin.parking_space_batch_create, name='admin_parking_space_batch_create'),
    
    # 车辆管理
    path('manage/vehicles/', admin.vehicle_list, name='admin_vehicle_list'),
    path('manage/vehicles/add/', admin.vehicle_edit, name='admin_vehicle_add'),
    path('manage/vehicles/<int:pk>/edit/', admin.vehicle_edit, name='admin_vehicle_edit'),
    path('manage/vehicles/<int:pk>/delete/', admin.vehicle_delete, name='admin_vehicle_delete'),
    
    # 停车记录管理
    path('manage/records/', admin.parking_record_list, name='admin_parking_record_list'),
    path('manage/records/<int:pk>/', admin.parking_record_detail, name='admin_parking_record_detail'),
    path('manage/records/<int:pk>/checkout/', admin.parking_record_checkout, name='admin_parking_record_checkout'),
    path('manage/records/<int:pk>/pay/', admin.parking_record_pay, name='admin_parking_record_pay'),
    
    # ==================== 用户认证 ====================
    path('register/', auth_views.register_view, name='register'),
    path('forgot-password/', auth_views.forgot_password_view, name='forgot_password'),
    path('reset-password/', auth_views.reset_password_view, name='reset_password'),
    path('api/send-verification-code/', auth_views.send_verification_code, name='api_send_verification_code'),
    path('api/verify-code/', auth_views.verify_code, name='api_verify_code'),
    path('api/check-username/', auth_views.check_username, name='api_check_username'),
    path('logout/', views_auth.logout_view, name='logout'),
    
    # ==================== 联系功能 ====================
    path('contact/', contact.contact_form, name='contact'),
    path('api/on-duty-staff/', contact.get_on_duty_staff, name='api_on_duty_staff'),
    path('api/admin-contacts/', contact.get_admin_contacts, name='api_admin_contacts'),
    path('manage/contact-messages/', contact.contact_message_list, name='admin_contact_message_list'),
    path('manage/contact-messages/<int:message_id>/reply/', contact.contact_message_reply, name='admin_contact_message_reply'),
    
    # ==================== 排班管理 ====================
    path('manage/schedules/', schedule.schedule_list, name='admin_schedule_list'),
    path('manage/schedules/template/', schedule.schedule_template_download, name='admin_schedule_template'),
    path('manage/schedules/upload/', schedule.schedule_upload, name='admin_schedule_upload'),
    
    # ==================== 费率管理 ====================
    path('manage/pricing/templates/', pricing.pricing_template_list, name='admin_pricing_template_list'),
    path('manage/pricing/templates/add/', pricing.pricing_template_edit, name='admin_pricing_template_add'),
    path('manage/pricing/templates/<int:template_id>/', pricing.pricing_template_edit, name='admin_pricing_template_edit'),
    path('manage/pricing/templates/<int:template_id>/delete/', pricing.pricing_template_delete, name='admin_pricing_template_delete'),
    path('api/pricing/preview/', pricing.pricing_preview, name='api_pricing_preview'),
    
    # ==================== 公安查询 ====================
    path('manage/police/query/', police.police_query_view, name='admin_police_query'),
    path('api/police/query/', police.police_query_api, name='api_police_query'),
    
    # ==================== 通缉警报 ====================
    path('manage/alert/wanted/', alert.wanted_vehicle_list, name='admin_wanted_vehicle_list'),
    path('manage/alert/wanted/add/', alert.wanted_vehicle_edit, name='admin_wanted_vehicle_add'),
    path('manage/alert/wanted/<int:pk>/', alert.wanted_vehicle_detail, name='admin_wanted_vehicle_detail'),
    path('manage/alert/wanted/<int:pk>/edit/', alert.wanted_vehicle_edit, name='admin_wanted_vehicle_edit'),
    path('manage/alert/wanted/<int:pk>/delete/', alert.wanted_vehicle_delete, name='admin_wanted_vehicle_delete'),
    path('manage/alert/wanted/<int:pk>/cancel/', alert.wanted_vehicle_cancel, name='admin_wanted_vehicle_cancel'),
    path('manage/alert/logs/', alert.alert_log_list, name='admin_alert_log_list'),
    path('manage/alert/logs/<int:pk>/handle/', alert.alert_log_handle, name='admin_alert_log_handle'),
]

