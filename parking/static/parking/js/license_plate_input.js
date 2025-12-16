/**
 * 车牌号输入组件
 *
 * 提供省份简称选择器和智能输入功能
 * 支持普通车牌（7位）和新能源车牌（8位）
 *
 * Author: HeZaoCha
 * Created: 2025-12-11
 * Version: 1.2.0
 */

// 省份简称列表（按常用顺序）
const PROVINCES = [
    { code: "粤", name: "广东" },
    { code: "京", name: "北京" },
    { code: "沪", name: "上海" },
    { code: "津", name: "天津" },
    { code: "渝", name: "重庆" },
    { code: "冀", name: "河北" },
    { code: "豫", name: "河南" },
    { code: "云", name: "云南" },
    { code: "辽", name: "辽宁" },
    { code: "黑", name: "黑龙江" },
    { code: "湘", name: "湖南" },
    { code: "皖", name: "安徽" },
    { code: "鲁", name: "山东" },
    { code: "苏", name: "江苏" },
    { code: "浙", name: "浙江" },
    { code: "赣", name: "江西" },
    { code: "鄂", name: "湖北" },
    { code: "桂", name: "广西" },
    { code: "甘", name: "甘肃" },
    { code: "晋", name: "山西" },
    { code: "蒙", name: "内蒙古" },
    { code: "陕", name: "陕西" },
    { code: "吉", name: "吉林" },
    { code: "闽", name: "福建" },
    { code: "贵", name: "贵州" },
    { code: "青", name: "青海" },
    { code: "藏", name: "西藏" },
    { code: "川", name: "四川" },
    { code: "宁", name: "宁夏" },
    { code: "琼", name: "海南" },
    { code: "使", name: "使领馆" },
    { code: "领", name: "领馆" },
];

// 地级市代号（不含I、O）
const CITY_CODES = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const CITY_LIST = CITY_CODES.split("");

/**
 * 创建分格车牌输入（8位格子）
 * @param {HTMLInputElement} hiddenInput - 隐藏的实际提交输入
 */
function createPlateGrid(hiddenInput) {
    const container = document.querySelector(
        `[data-plate-grid-for="${hiddenInput.id}"]`
    );
    if (!container) return;

    // 清空容器内容，避免重复创建
    container.innerHTML = "";
    container.classList.add("plate-grid");
    const cells = [];

    // 生成8个格子（兼容7位），在第7与第8位之间插入分隔点
    for (let i = 0; i < 8; i++) {
        const cell = document.createElement("input");
        cell.type = "text";
        cell.maxLength = 1;
        cell.className = "plate-cell";
        cell.inputMode = "text";
        cell.autocomplete = "off";
        if (i === 7) {
            cell.dataset.energy = "true";
        }
        container.appendChild(cell);
        cells.push(cell);
        if (i === 6) {
            const dot = document.createElement("span");
            dot.className = "plate-dot";
            dot.textContent = "·";
            container.appendChild(dot);
        }
    }

    // 填充初始值
    const initValue = (hiddenInput.value || "").toUpperCase().slice(0, 8);
    initValue.split("").forEach((ch, idx) => {
        if (cells[idx]) cells[idx].value = ch;
    });

    // 省份选择器绑定到首格，城市选择器绑定到第二格
    const provincePicker = createProvincePicker(cells[0]);
    const cityPicker = createCityPicker(cells[1]);

    // 更新隐藏输入
    const updateHidden = () => {
        const val = cells
            .map((c) => c.value.toUpperCase())
            .join("")
            .trim();
        hiddenInput.value = val;
        hiddenInput.dispatchEvent(new Event("input"));
    };

    // 绑定事件：输入后自动跳转到下一格
    cells.forEach((cell, idx) => {
        cell.addEventListener("focus", () => {
            // 第一个单元格：显示省份选择器
            if (idx === 0 && provincePicker) {
                const value = cell.value.trim();
                if (
                    value.length === 0 ||
                    !PROVINCES.find((p) => p.code === value)
                ) {
                    // 延迟显示，确保模态框动画完成
                    setTimeout(() => {
                        showProvincePicker(cell, provincePicker);
                    }, 100);
                }
            }
            // 第二个单元格：显示城市选择器
            if (idx === 1 && cityPicker) {
                // 延迟显示，确保模态框动画完成
                setTimeout(() => {
                    showCityPicker(cell, cityPicker);
                }, 100);
            }
        });
        
        // 添加点击事件，确保点击时也能弹出键盘
        cell.addEventListener("click", () => {
            // 第一个单元格：显示省份选择器
            if (idx === 0 && provincePicker) {
                const value = cell.value.trim();
                if (
                    value.length === 0 ||
                    !PROVINCES.find((p) => p.code === value)
                ) {
                    setTimeout(() => {
                        showProvincePicker(cell, provincePicker);
                    }, 50);
                }
            }
            // 第二个单元格：显示城市选择器
            if (idx === 1 && cityPicker) {
                setTimeout(() => {
                    showCityPicker(cell, cityPicker);
                }, 50);
            }
        });

        cell.addEventListener("input", (e) => {
            let v = e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9\u4e00-\u9fa5]/g, "");
            if (v.length > 1) v = v[0];
            e.target.value = v;
            // 自动跳转
            if (v && idx < cells.length - 1) {
                cells[idx + 1].focus();
                cells[idx + 1].select();
            }
            updateHidden();
        });

        cell.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !cell.value && idx > 0) {
                cells[idx - 1].focus();
                cells[idx - 1].select();
            }
        });
    });
}

/**
 * 创建车牌号输入组件
 * @param {string} inputId - 输入框ID
 * @param {Object} options - 配置选项
 */
function createLicensePlateInput(inputId, options = {}) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const {
        showProvincePicker = true,
        maxLength = 10,
        onValidate = null,
        onInput = null,
    } = options;

    // 创建省份选择器容器
    let pickerContainer = null;
    if (showProvincePicker) {
        pickerContainer = createProvincePicker(input);
    }

    // 绑定输入事件
    input.addEventListener("focus", function () {
        if (showProvincePicker && pickerContainer) {
            // 如果输入框为空或第一个字符不是省份简称，显示选择器
            const value = input.value.trim();
            if (
                value.length === 0 ||
                !PROVINCES.find((p) => p.code === value[0])
            ) {
                showProvincePicker(input, pickerContainer);
            }
        }
    });

    input.addEventListener("input", function (e) {
        let value = e.target.value.toUpperCase();

        // 自动过滤无效字符
        value = value.replace(/[^A-Z0-9\u4e00-\u9fa5]/g, "");

        // 限制长度
        if (value.length > maxLength) {
            value = value.substring(0, maxLength);
        }

        e.target.value = value;

        // 实时验证
        if (onValidate && value.length >= 7) {
            validateLicensePlate(value, input, onValidate);
        }

        if (onInput) {
            onInput(value);
        }
    });

    // 智能输入提示
    input.addEventListener("keydown", function (e) {
        handleSmartInput(e, input);
    });
}

/**
 * 创建省份选择器
 */
function createProvincePicker(input) {
    const container = document.createElement("div");
    container.id = `province-picker-${input.id}`;
    container.className =
        "province-picker hidden fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-3 max-h-64 overflow-y-auto";
    container.style.minWidth = "300px";

    // 创建省份按钮网格
    const grid = document.createElement("div");
    grid.className = "grid grid-cols-6 gap-2";

    PROVINCES.forEach((province) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
            "px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-primary-500 hover:text-white rounded transition-colors";
        btn.textContent = province.code;
        btn.title = province.name;
        btn.addEventListener("click", function () {
            selectProvince(input, province.code, container);
        });
        grid.appendChild(btn);
    });

    container.appendChild(grid);

    // 插入到body，使用fixed定位
    document.body.appendChild(container);

    return container;
}

/**
 * 创建地级市选择器（第二位）
 */
function createCityPicker(input) {
    const container = document.createElement("div");
    container.id = `city-picker-${input.id}`;
    container.className =
        "city-picker hidden fixed z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg p-3 max-h-64 overflow-y-auto";
    container.style.minWidth = "260px";

    const grid = document.createElement("div");
    grid.className = "grid grid-cols-6 gap-2";

    CITY_LIST.forEach((code) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
            "px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-primary-500 hover:text-white rounded transition-colors";
        btn.textContent = code;
        btn.addEventListener("click", function () {
            input.value = code;
            input.dispatchEvent(new Event("input"));
            container.classList.add("hidden");
            if (
                input.nextElementSibling &&
                input.nextElementSibling.classList.contains("plate-cell")
            ) {
                input.nextElementSibling.focus();
                input.nextElementSibling.select();
            }
        });
        grid.appendChild(btn);
    });

    container.appendChild(grid);
    // 插入到body，使用fixed定位
    document.body.appendChild(container);
    return container;
}

/**
 * 显示省份选择器
 */
function showProvincePicker(input, container) {
    if (!container) return;

    // 隐藏其他选择器
    document.querySelectorAll(".province-picker").forEach((picker) => {
        if (picker !== container) picker.classList.add("hidden");
    });

    // 定位在输入框下方，考虑模态框和滚动位置
    const rect = input.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    
    // 计算相对于文档的位置
    const top = rect.bottom + scrollY + 5;
    const left = rect.left + scrollX;
    
    // 检查是否会超出视口，如果超出则调整位置
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const pickerHeight = 300; // 预估选择器高度
    const pickerWidth = 300; // 预估选择器宽度
    
    let finalTop = top;
    let finalLeft = left;
    
    // 如果下方空间不足，显示在上方
    if (rect.bottom + pickerHeight > viewportHeight && rect.top > pickerHeight) {
        finalTop = rect.top + scrollY - pickerHeight - 5;
    }
    
    // 如果右侧空间不足，调整到左侧
    if (rect.left + pickerWidth > viewportWidth) {
        finalLeft = rect.right + scrollX - pickerWidth;
    }
    
    // 确保不超出左边界
    if (finalLeft < scrollX) {
        finalLeft = scrollX + 10;
    }
    
    container.style.position = "fixed";
    container.style.top = finalTop + "px";
    container.style.left = finalLeft + "px";
    container.style.zIndex = "9999";

    container.classList.remove("hidden");

    // 点击外部关闭
    const closeHandler = (e) => {
        if (!container.contains(e.target) && e.target !== input && !input.contains(e.target)) {
            container.classList.add("hidden");
            document.removeEventListener("click", closeHandler);
        }
    };
    setTimeout(() => document.addEventListener("click", closeHandler), 100);
}

/**
 * 显示城市选择器
 */
function showCityPicker(input, container) {
    if (!container) return;
    
    // 隐藏其他选择器
    document.querySelectorAll(".city-picker").forEach((picker) => {
        if (picker !== container) picker.classList.add("hidden");
    });
    
    // 定位在输入框下方，考虑模态框和滚动位置
    const rect = input.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;
    
    // 计算相对于文档的位置
    const top = rect.bottom + scrollY + 5;
    const left = rect.left + scrollX;
    
    // 检查是否会超出视口，如果超出则调整位置
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const pickerHeight = 300; // 预估选择器高度
    const pickerWidth = 300; // 预估选择器宽度
    
    let finalTop = top;
    let finalLeft = left;
    
    // 如果下方空间不足，显示在上方
    if (rect.bottom + pickerHeight > viewportHeight && rect.top > pickerHeight) {
        finalTop = rect.top + scrollY - pickerHeight - 5;
    }
    
    // 如果右侧空间不足，调整到左侧
    if (rect.left + pickerWidth > viewportWidth) {
        finalLeft = rect.right + scrollX - pickerWidth;
    }
    
    // 确保不超出左边界
    if (finalLeft < scrollX) {
        finalLeft = scrollX + 10;
    }
    
    container.style.position = "fixed";
    container.style.top = finalTop + "px";
    container.style.left = finalLeft + "px";
    container.style.zIndex = "9999";
    
    container.classList.remove("hidden");
    
    // 点击外部关闭
    const closeHandler = (e) => {
        if (!container.contains(e.target) && e.target !== input && !input.contains(e.target)) {
            container.classList.add("hidden");
            document.removeEventListener("click", closeHandler);
        }
    };
    setTimeout(() => document.addEventListener("click", closeHandler), 100);
}

/**
 * 选择省份
 */
function selectProvince(input, provinceCode, container) {
    const currentValue = input.value;

    // 如果输入框为空或第一个字符不是省份简称，直接替换
    if (
        currentValue.length === 0 ||
        !PROVINCES.find((p) => p.code === currentValue[0])
    ) {
        input.value = provinceCode;
    } else {
        // 替换第一个字符
        input.value = provinceCode + currentValue.substring(1);
    }

    // 触发input事件
    input.dispatchEvent(new Event("input"));

    // 聚焦到输入框
    input.focus();

    // 隐藏选择器
    container.classList.add("hidden");

    // 移动光标到第二位（地级市位置）
    if (input.setSelectionRange) {
        input.setSelectionRange(1, 1);
    }
}

/**
 * 智能输入处理
 */
function handleSmartInput(e, input) {
    const value = input.value;
    const cursorPos = input.selectionStart || 0;

    // 第二位输入地级市代号时，自动转换为大写并验证
    if (cursorPos === 1 && e.key.length === 1 && /[a-z]/i.test(e.key)) {
        const upperKey = e.key.toUpperCase();
        if (CITY_CODES.includes(upperKey)) {
            e.preventDefault();
            input.value = value.substring(0, 1) + upperKey + value.substring(2);
            input.setSelectionRange(2, 2);
            input.dispatchEvent(new Event("input"));
        } else if (upperKey === "I" || upperKey === "O") {
            e.preventDefault();
            // 可以显示提示：不能使用I和O
        }
    }

    // 新能源车牌检测（第3位是D或F）
    if (
        cursorPos === 2 &&
        (e.key === "D" || e.key === "F" || e.key === "d" || e.key === "f")
    ) {
        // 新能源车牌，允许8位
        if (input.maxLength < 8) {
            input.maxLength = 8;
        }
    }
}

/**
 * 验证车牌号
 */
async function validateLicensePlate(plate, input, callback) {
    try {
        const response = await fetch(
            `/parking/api/validate-plate/?license_plate=${encodeURIComponent(
                plate
            )}`
        );
        const result = await response.json();

        if (callback) {
            callback(result, input);
        }
    } catch (error) {
        console.error("车牌号验证失败:", error);
    }
}

/**
 * 初始化所有车牌号输入框
 */
function initLicensePlateInputs() {
    // 先处理分格输入（隐藏实际输入框）
    const segmentedFields = document.querySelectorAll(
        'input[data-plate-field="true"]'
    );
    segmentedFields.forEach((hidden) => {
        // 如果已经增强过，跳过
        if (hidden.dataset.enhanced === "true") return;

        // 确保有ID
        if (!hidden.id) {
            hidden.id =
                "license-plate-" + Math.random().toString(36).substr(2, 9);
        }

        createPlateGrid(hidden);
        hidden.dataset.enhanced = "true";
    });
}

// DOM加载完成后初始化
document.addEventListener("DOMContentLoaded", function () {
    initLicensePlateInputs();
    
    // 处理模态框打开时的延迟初始化
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) { // Element node
                    // 检查是否有新的plate-field
                    const newFields = node.querySelectorAll && node.querySelectorAll('input[data-plate-field="true"]');
                    if (newFields && newFields.length > 0) {
                        newFields.forEach((hidden) => {
                            if (hidden.dataset.enhanced !== "true") {
                                if (!hidden.id) {
                                    hidden.id = "license-plate-" + Math.random().toString(36).substr(2, 9);
                                }
                                createPlateGrid(hidden);
                                hidden.dataset.enhanced = "true";
                            }
                        });
                    }
                }
            });
        });
    });
    
    // 观察整个文档的变化
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 再处理普通文本输入（兼容老表单）
    const plateInputs = document.querySelectorAll(
        'input[data-license-plate="true"], input[type="text"][id*="plate"], input[type="text"][id*="Plate"]'
    );

    plateInputs.forEach((input) => {
        if (input.dataset.enhanced === "true") return;
        if (!input.id) {
            input.id =
                "license-plate-" + Math.random().toString(36).substr(2, 9);
        }
        createLicensePlateInput(input.id, {
            showProvincePicker: true,
            maxLength: 10,
        });
        input.dataset.enhanced = "true";
    });
});
