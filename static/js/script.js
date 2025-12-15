// 形状定义 - 使用修正后的坐标
const shapes = {
    'L': [[0,0], [1,0], [2,0], [3,0], [3,1]],  // 竖4横1
    'T': [[0,0], [0,1], [0,2], [1,1], [2,1]],  // T形
    'IV': [[0,0], [1,0], [1,1], [0,2], [1,3]], // i占两格，v占三格，紧凑排列
    '∠': [[0,0], [1,0], [2,0], [1,1], [0,2]],  // 锐角形状
    '∟': [[0,0], [0,1], [0,2], [1,0], [2,0]],  // 直角形状，两边相等
    'p': [[0,0], [1,0], [2,0], [1,1], [2,1]],  // p形
    '凹': [[0,0], [0,1], [0,2], [1,0], [1,2]],  // 凹形
    '独立双线段': [[0,0], [1,0], [2,0], [3,3], [4,3]]  // 新增：两条独立线段，一条3点，一条2点，可以任意放置
};

// 形状详细描述
const shapeDescriptions = {
    'L': "L形由4个垂直排列的格子和1个水平延伸的格子组成，形成L形状",
    'T': "T形由3个水平排列的格子和2个垂直延伸的格子组成，形成T字形状",
    'IV': "IV形由i部分(2个垂直格子)和V部分(3个斜向格子)紧凑组合而成",
    '∠': "∠形形成锐角形状，由底部3个水平格子、中间1个格子和顶部1个格子组成",
    '∟': "∟形是直角形状，两条边长度相等，由3个垂直格子和2个水平格子组成",
    'p': "p形类似字母P，由3个垂直格子和2个水平延伸的格子组成",
    '凹': "凹形中间凹陷，由5个格子组成，中间缺少一个格子形成凹槽",
    '独立双线段': "独立双线段形由两条完全独立的线段组成，一条线段有3个格子，一条线段有2个格子，可以出现在网格内的任意位置"  // 新增描述
};

// 应用状态
const appState = {
    selectedShapes: [],
    hasTreasure: [], // 有宝藏的格子
    noTreasure: [],  // 无宝藏的格子
    currentMarkingMode: 'treasure', // 默认标记模式为有宝藏
    calculationTimer: null
};

// DOM元素缓存
const domElements = {
    shapeSelection: null,
    shapeDescriptions: null,
    treasureGrid: null,
    resetBtn: null,
    resultInfo: null,
    markingModeRadios: null
};

// 初始化应用
function initApp() {
    cacheDomElements();
    initShapeSelection();
    initShapeDescriptions();
    initMainGrid();
    bindEvents();
}

// 缓存DOM元素以提高性能
function cacheDomElements() {
    domElements.shapeSelection = document.getElementById('shape-selection');
    domElements.shapeDescriptions = document.querySelector('.shape-descriptions');
    domElements.treasureGrid = document.getElementById('treasure-grid');
    domElements.resetBtn = document.getElementById('reset-btn');
    domElements.resultInfo = document.getElementById('result-info');
    domElements.markingModeRadios = document.querySelectorAll('input[name="marking-mode"]');
}

// 初始化形状选择
function initShapeSelection() {
    domElements.shapeSelection.innerHTML = '';

    for (const shapeName in shapes) {
        const option = document.createElement('div');
        option.className = 'shape-option';
        option.innerHTML = `
            <input type="checkbox" id="shape-${shapeName}" value="${shapeName}">
            <label for="shape-${shapeName}">${shapeName} 形</label>
        `;
        domElements.shapeSelection.appendChild(option);

        // 为复选框添加事件监听
        const checkbox = option.querySelector('input');
        checkbox.addEventListener('change', function() {
            updateShapeSelection(this, shapeName);
            scheduleCalculation();
        });
    }
}

// 更新形状选择状态
function updateShapeSelection(checkbox, shapeName) {
    if (checkbox.checked) {
        checkbox.parentElement.classList.add('selected');
        if (!appState.selectedShapes.includes(shapeName)) {
            appState.selectedShapes.push(shapeName);
        }
    } else {
        checkbox.parentElement.classList.remove('selected');
        appState.selectedShapes = appState.selectedShapes.filter(s => s !== shapeName);
    }
}

// 初始化形状描述
function initShapeDescriptions() {
    domElements.shapeDescriptions.innerHTML = '';

    for (const shapeName in shapes) {
        const descriptionItem = document.createElement('div');
        descriptionItem.className = 'shape-description-item';
        descriptionItem.innerHTML = `
            <h3>${shapeName} 形</h3>
            <p>${shapeDescriptions[shapeName]}</p>
        `;
        domElements.shapeDescriptions.appendChild(descriptionItem);
    }
}

// 初始化主网格
function initMainGrid() {
    domElements.treasureGrid.innerHTML = '';

    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.id = `cell-${i}-${j}`;
            cell.dataset.x = i;
            cell.dataset.y = j;

            const coordinates = document.createElement('div');
            coordinates.className = 'coordinates';
            coordinates.textContent = `${i+1},${j+1}`;

            const count = document.createElement('div');
            count.className = 'count';
            count.textContent = '0';

            cell.appendChild(coordinates);
            cell.appendChild(count);
            domElements.treasureGrid.appendChild(cell);
        }
    }
}

// 绑定事件
function bindEvents() {
    // 网格点击事件委托
    domElements.treasureGrid.addEventListener('click', function(e) {
        const cell = e.target.closest('.cell');
        if (cell) {
            handleCellClick(cell);
        }
    });

    // 重置按钮事件
    domElements.resetBtn.addEventListener('click', resetUserInput);

    // 标记模式变化事件
    domElements.markingModeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            appState.currentMarkingMode = this.value;
        });
    });
}

// 处理格子点击
function handleCellClick(cell) {
    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);
    const cellPos = [x, y];

    // 根据当前标记模式处理点击
    if (appState.currentMarkingMode === 'treasure') {
        // 标记有宝藏模式
        if (appState.hasTreasure.some(pos => pos[0] === x && pos[1] === y)) {
            // 如果已经在有宝藏列表中，则移除
            appState.hasTreasure = appState.hasTreasure.filter(pos => !(pos[0] === x && pos[1] === y));
            cell.classList.remove('has-treasure');
        } else {
            // 添加到有宝藏列表
            appState.hasTreasure.push(cellPos);
            cell.classList.add('has-treasure');
            cell.classList.remove('no-treasure');

            // 如果同时在无宝藏列表中，则移除
            if (appState.noTreasure.some(pos => pos[0] === x && pos[1] === y)) {
                appState.noTreasure = appState.noTreasure.filter(pos => !(pos[0] === x && pos[1] === y));
            }
        }
    } else {
        // 标记无宝藏模式
        if (appState.noTreasure.some(pos => pos[0] === x && pos[1] === y)) {
            // 如果已经在无宝藏列表中，则移除
            appState.noTreasure = appState.noTreasure.filter(pos => !(pos[0] === x && pos[1] === y));
            cell.classList.remove('no-treasure');
        } else {
            // 添加到无宝藏列表
            appState.noTreasure.push(cellPos);
            cell.classList.add('no-treasure');
            cell.classList.remove('has-treasure');

            // 如果同时在有宝藏列表中，则移除
            if (appState.hasTreasure.some(pos => pos[0] === x && pos[1] === y)) {
                appState.hasTreasure = appState.hasTreasure.filter(pos => !(pos[0] === x && pos[1] === y));
            }
        }
    }

    scheduleCalculation();
}

// 安排计算（防抖）
function scheduleCalculation() {
    if (appState.calculationTimer) {
        clearTimeout(appState.calculationTimer);
    }

    appState.calculationTimer = setTimeout(() => {
        calculatePositions();
    }, 150); // 减少防抖时间，提高响应速度
}

// 计算概率位置
async function calculatePositions() {
    if (appState.selectedShapes.length === 0) {
        domElements.resultInfo.textContent = '请至少选择一个形状';
        resetGridDisplay();
        return;
    }

    // 显示加载状态
    domElements.treasureGrid.classList.add('loading');

    try {
        const response = await fetch('/get_positions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shapes: appState.selectedShapes,
                has_treasure: appState.hasTreasure,
                no_treasure: appState.noTreasure
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        updateGrid(data);
        const shapesText = appState.selectedShapes.join('、');
        domElements.resultInfo.textContent =
            `形状 "${shapesText}" 共有 ${data.all_positions_count} 种可能位置（已考虑所有角度）`;
    } catch (error) {
        console.error('Error:', error);
        domElements.resultInfo.textContent = '计算出错，请重试';
    } finally {
        // 移除加载状态
        domElements.treasureGrid.classList.remove('loading');
    }
}

// 重置网格显示
function resetGridDisplay() {
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const cell = document.getElementById(`cell-${i}-${j}`);
            if (cell) {
                cell.querySelector('.count').textContent = '0';
                // 使用更高效的方式重置类名
                cell.className = 'cell';
            }
        }
    }
}

// 重置用户输入
function resetUserInput() {
    appState.hasTreasure = [];
    appState.noTreasure = [];

    // 重置所有格子的标记
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const cell = document.getElementById(`cell-${i}-${j}`);
            if (cell) {
                cell.className = 'cell';
                cell.querySelector('.count').textContent = '0';
            }
        }
    }

    domElements.resultInfo.textContent = '用户输入已重置';
}

// 更新网格显示 - 优化版本
function updateGrid(data) {
    // 批量更新DOM，减少重绘次数
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            const cell = document.getElementById(`cell-${i}-${j}`);
            if (!cell) continue;

            // 保存用户标记状态
            const hasTreasureClass = cell.classList.contains('has-treasure');
            const noTreasureClass = cell.classList.contains('no-treasure');

            // 重置概率相关类
            cell.className = 'cell';

            // 恢复用户标记
            if (hasTreasureClass) cell.classList.add('has-treasure');
            if (noTreasureClass) cell.classList.add('no-treasure');

            // 更新计数显示
            const count = data.grid_counts[i][j];
            cell.querySelector('.count').textContent = count;

            // 根据概率设置背景色
            if (count > 0) {
                const probabilityClass = `probability-${Math.min(count, 10)}`;
                cell.classList.add(probabilityClass);
            }
        }
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', initApp);