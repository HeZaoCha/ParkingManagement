"""
初始化车牌号地址映射数据

根据全国汽车牌照号详解细表，初始化省份、地级市和车牌号位置映射数据。

Author: HeZaoCha
Created: 2025-12-11
Version: 1.2.0

参考文档：
https://baike.baidu.com/item/%E5%85%A8%E5%9B%BD%E6%B1%BD%E8%BD%A6%E7%89%8C%E7%85%A7%E5%8F%B7%E8%AF%A6%E8%A7%A3%E7%BB%86%E8%A1%A8/1503883
"""
from django.core.management.base import BaseCommand

from parking.license_plate_models import City, LicensePlateLocation, Province


class Command(BaseCommand):
    help = '初始化车牌号地址映射数据'
    
    def handle(self, *args, **options):
        self.stdout.write('开始初始化车牌号地址映射数据...')
        
        # 省份数据
        provinces_data = [
            ('京', '北京', False),
            ('津', '天津', False),
            ('沪', '上海', False),
            ('渝', '重庆', False),
            ('冀', '河北', False),
            ('豫', '河南', False),
            ('云', '云南', False),
            ('辽', '辽宁', False),
            ('黑', '黑龙江', False),
            ('湘', '湖南', False),
            ('皖', '安徽', False),
            ('鲁', '山东', False),
            ('新', '新疆', False),
            ('苏', '江苏', False),
            ('浙', '浙江', False),
            ('赣', '江西', False),
            ('鄂', '湖北', False),
            ('桂', '广西', False),
            ('甘', '甘肃', False),
            ('晋', '山西', False),
            ('蒙', '内蒙古', False),
            ('陕', '陕西', False),
            ('吉', '吉林', False),
            ('闽', '福建', False),
            ('贵', '贵州', False),
            ('粤', '广东', False),
            ('青', '青海', False),
            ('藏', '西藏', False),
            ('川', '四川', False),
            ('宁', '宁夏', False),
            ('琼', '海南', False),
            ('使', '使领馆', True),
            ('领', '领馆', True),
        ]
        
        # 创建省份
        province_map = {}
        for code, name, is_special in provinces_data:
            province, created = Province.objects.get_or_create(
                code=code,
                defaults={'name': name, 'is_special': is_special}
            )
            province_map[code] = province
            if created:
                self.stdout.write(self.style.SUCCESS(f'创建省份: {code} - {name}'))
        
        # 主要地级市数据（示例，可根据需要扩展）
        cities_data = [
            # 广东省
            ('粤', 'A', '广州', True),
            ('粤', 'B', '深圳', False),
            ('粤', 'C', '珠海', False),
            ('粤', 'D', '汕头', False),
            ('粤', 'E', '佛山', False),
            ('粤', 'F', '韶关', False),
            ('粤', 'G', '湛江', False),
            ('粤', 'H', '肇庆', False),
            ('粤', 'J', '江门', False),
            ('粤', 'K', '茂名', False),
            ('粤', 'L', '惠州', False),
            ('粤', 'M', '梅州', False),
            ('粤', 'N', '汕尾', False),
            ('粤', 'P', '河源', False),
            ('粤', 'Q', '阳江', False),
            ('粤', 'R', '清远', False),
            ('粤', 'S', '东莞', False),
            ('粤', 'T', '中山', False),
            ('粤', 'U', '潮州', False),
            ('粤', 'V', '揭阳', False),
            ('粤', 'W', '云浮', False),
            # 北京市
            ('京', 'A', '北京', True),
            ('京', 'B', '北京（出租车）', False),
            ('京', 'C', '北京（远郊区县）', False),
            # 上海市
            ('沪', 'A', '上海', True),
            ('沪', 'B', '上海', False),
            ('沪', 'C', '上海', False),
            # 更多省份和城市可以根据需要添加...
        ]
        
        # 创建地级市和车牌号位置映射
        for prov_code, city_code, city_name, is_capital in cities_data:
            if prov_code not in province_map:
                continue
            
            province = province_map[prov_code]
            
            # 创建地级市
            city, created = City.objects.get_or_create(
                province=province,
                code=city_code,
                defaults={'name': city_name, 'is_capital': is_capital}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'创建地级市: {prov_code}{city_code} - {city_name}'))
            
            # 创建车牌号位置映射
            prefix = f'{prov_code}{city_code}'
            location, created = LicensePlateLocation.objects.get_or_create(
                license_plate_prefix=prefix,
                defaults={
                    'province': province,
                    'city': city,
                    'description': f'{province.name}{city_name}'
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'创建车牌号映射: {prefix} - {city_name}'))
        
        self.stdout.write(self.style.SUCCESS('\n初始化完成！'))
        self.stdout.write(f'省份数量: {Province.objects.count()}')
        self.stdout.write(f'地级市数量: {City.objects.count()}')
        self.stdout.write(f'车牌号映射数量: {LicensePlateLocation.objects.count()}')

