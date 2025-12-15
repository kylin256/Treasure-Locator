from fastapi import FastAPI, Request, Form, Depends
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, HTMLResponse
from pydantic import BaseModel
import numpy as np
from typing import List, Tuple
import json

# 创建 FastAPI 应用
app = FastAPI(
    title="宝藏位置辅助计算器",
    description="基于 FastAPI 的宝藏位置辅助计算器",
    version="1.0.0"
)

# 挂载静态文件和模板
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# 形状定义
BASE_SHAPES = {
    'L': [(0, 0), (1, 0), (2, 0), (3, 0), (3, 1)],  # 竖4横1
    'T': [(0, 0), (0, 1), (0, 2), (1, 1), (2, 1)],  # T形
    'IV': [(0, 0), (1, 0), (1, 1), (0, 2), (1, 3)],  # i占两格，v占三格，紧凑排列
    '∠': [(0, 0), (1, 0), (2, 0), (1, 1), (0, 2)],  # 锐角形状
    '∟': [(0, 0), (0, 1), (0, 2), (1, 0), (2, 0)],  # 直角形状，两边相等
    'p': [(0, 0), (1, 0), (2, 0), (1, 1), (2, 1)],  # p形
    '凹': [(0, 0), (0, 1), (0, 2), (1, 0), (1, 2)],  # 凹形
    '独立双线段': [(0, 0), (1, 0), (2, 0), (3, 3), (4, 3)]  # 新增：两条独立线段，一条3点，一条2点，可以任意放置
}


# 请求模型
class PositionRequest(BaseModel):
    shapes: List[str]
    has_treasure: List[List[int]]
    no_treasure: List[List[int]]


class PositionResponse(BaseModel):
    grid_counts: List[List[int]]
    all_positions_count: int


def rotate_shape(shape: List[Tuple[int, int]], rotation: int) -> List[Tuple[int, int]]:
    """旋转形状 (0:0°, 1:90°, 2:180°, 3:270°)"""
    if rotation == 0:
        return shape

    rotated = []
    for x, y in shape:
        if rotation == 1:  # 90°
            new_x, new_y = -y, x
        elif rotation == 2:  # 180°
            new_x, new_y = -x, -y
        elif rotation == 3:  # 270°
            new_x, new_y = y, -x
        rotated.append((new_x, new_y))

    # 归一化到第一象限
    min_x = min(x for x, y in rotated)
    min_y = min(y for x, y in rotated)

    return [(x - min_x, y - min_y) for x, y in rotated]


def get_all_positions_for_shape(shape: str, grid_size: int = 5) -> List[List[Tuple[int, int]]]:
    """获取单个形状在网格中的所有可能位置（包括所有旋转）"""
    positions = []

    # 对于独立双线段形状，我们需要特殊处理
    if shape == "独立双线段":
        # 生成所有可能的两条线段组合
        positions = generate_double_line_positions(grid_size)
    else:
        # 其他形状使用原来的方法
        for rotation in range(4):
            shape_cells = rotate_shape(BASE_SHAPES[shape], rotation)

            # 获取形状的尺寸
            max_x = max(cell[0] for cell in shape_cells)
            max_y = max(cell[1] for cell in shape_cells)

            # 遍历所有可能的起始位置
            for start_x in range(grid_size - max_x):
                for start_y in range(grid_size - max_y):
                    # 计算形状在当前起始位置的所有格子坐标
                    current_pos = [(start_x + cell[0], start_y + cell[1]) for cell in shape_cells]
                    positions.append(current_pos)

    return positions


def generate_double_line_positions(grid_size: int = 5) -> List[List[Tuple[int, int]]]:
    """生成所有可能的独立双线段位置"""
    positions = []

    # 生成所有可能的3格线段位置
    three_cell_lines = []
    two_cell_lines = []

    # 生成水平线段
    for y in range(grid_size):
        for start_x in range(grid_size - 2):  # 3格线段需要至少3个水平位置
            three_cell_lines.append([(start_x, y), (start_x + 1, y), (start_x + 2, y)])

        for start_x in range(grid_size - 1):  # 2格线段需要至少2个水平位置
            two_cell_lines.append([(start_x, y), (start_x + 1, y)])

    # 生成垂直线段
    for x in range(grid_size):
        for start_y in range(grid_size - 2):  # 3格线段需要至少3个垂直位置
            three_cell_lines.append([(x, start_y), (x, start_y + 1), (x, start_y + 2)])

        for start_y in range(grid_size - 1):  # 2格线段需要至少2个垂直位置
            two_cell_lines.append([(x, start_y), (x, start_y + 1)])

    # 生成所有可能的组合，确保两条线段不重叠
    for line3 in three_cell_lines:
        for line2 in two_cell_lines:
            # 检查两条线段是否有重叠
            if not has_overlap(line3, line2):
                # 合并两条线段
                combined = line3 + line2
                positions.append(combined)

    return positions


def has_overlap(line1: List[Tuple[int, int]], line2: List[Tuple[int, int]]) -> bool:
    """检查两条线段是否有重叠的格子"""
    set1 = set(line1)
    set2 = set(line2)
    return len(set1.intersection(set2)) > 0


def filter_positions(
        positions: List[List[Tuple[int, int]]],
        has_treasure: List[List[int]],
        no_treasure: List[List[int]]
) -> List[List[Tuple[int, int]]]:
    """根据用户输入过滤位置"""
    filtered = []

    # 转换为元组以便比较
    has_treasure_tuples = [tuple(cell) for cell in has_treasure]
    no_treasure_tuples = [tuple(cell) for cell in no_treasure]

    for position in positions:
        # 检查是否包含所有有宝藏的格子
        has_all_treasure = all(cell in position for cell in has_treasure_tuples)

        # 检查是否不包含任何无宝藏的格子
        has_no_treasure = all(cell not in position for cell in no_treasure_tuples)

        if has_all_treasure and has_no_treasure:
            filtered.append(position)

    return filtered


def get_probability_positions(
        shapes: List[str],
        has_treasure: List[List[int]],
        no_treasure: List[List[int]]
) -> Tuple[np.ndarray, List[List[Tuple[int, int]]]]:
    """获取多个形状的宝藏概率位置"""
    all_positions = []

    # 收集所有形状的所有可能位置
    for shape in shapes:
        all_positions.extend(get_all_positions_for_shape(shape))

    # 根据用户输入过滤位置
    filtered_positions = filter_positions(all_positions, has_treasure, no_treasure)

    # 统计每个格子被覆盖的次数
    grid_counts = np.zeros((5, 5))
    for position in filtered_positions:
        for cell in position:
            grid_counts[cell[0], cell[1]] += 1

    return grid_counts, filtered_positions


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """渲染主页面"""
    return templates.TemplateResponse("index.html", {
        "request": request,
        "shapes": list(BASE_SHAPES.keys())
    })


@app.post("/get_positions", response_model=PositionResponse)
async def calculate_positions(data: PositionRequest):
    """计算宝藏位置概率"""
    grid_counts, filtered_positions = get_probability_positions(
        data.shapes, data.has_treasure, data.no_treasure
    )

    # 转换为列表格式返回
    result = {
        "grid_counts": grid_counts.astype(int).tolist(),
        "all_positions_count": len(filtered_positions)
    }

    return PositionResponse(**result)


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "message": "宝藏位置辅助定位系统运行正常"}


# 如果直接运行此文件
if __name__ == "__main__":
    import uvicorn
    import os
    os.environ["PYTHONUNBUFFERED"] = "1"

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
    print("程序启动成功")
