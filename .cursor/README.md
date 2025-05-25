# 餐厅菜品精准推荐系统

## 项目概括
本项目旨在开发一个基于Node.js的Web端菜品精准推荐系统。前端（小程序/平板）采集用户健康限制（年龄、性别、基础病、忌口、过敏原），Web端接收信息后，通过智能推荐引擎实时过滤和推荐菜品，在1秒内生成推荐列表并返回，自动屏蔽所有冲突菜品。系统还将动态显示核心营养素（蛋白质/脂肪/碳水的供能比）和过敏原警示标识。

## 技术选型
- 主要编程语言: JavaScript (Node.js for backend, HTML/CSS/JS for frontend)
- Web框架: Express.js
- 数据格式: JSON
- 版本控制: Git
- 前端技术:
    - 微信小程序
    - 平板应用 (具体技术栈根据实际选择，如React Native, Flutter, 或原生开发)
- 辅助工具:
    - ESLint (代码检查)
    - Prettier (代码格式化)
    - Jest / Mocha (测试框架 - 规划中)
    - Docker (容器化 - 规划中)
    - Nginx (Web服务器 - 规划中)
    - Redis (缓存 - 规划中)

## 项目结构 / 模块划分
- `/core/`: 核心推荐和过滤逻辑模块
    - `recommending.js`: 包含核心推荐算法和安全过滤逻辑。
- `/public/`: 前端静态文件
    - `index.html`: 用户信息输入和推荐结果展示页面。
    - `script.js`: 前端交互逻辑，与后端API通信。
    - `style.css`: 前端页面样式。
- `/node_modules/`: 项目依赖库
- `app.js`: Express应用入口，处理API请求路由。
- `dishes_recommendation.json`: 菜品数据文件。
- `test_api.js`: 后端API测试脚本。
- `package.json`: Node.js项目依赖和脚本配置。
- `package-lock.json`: 锁定项目依赖版本。
- `.gitignore`: Git忽略配置。
- `.eslintrc.js`: ESLint 配置文件。
- `.prettierrc.js`: Prettier 配置文件。
- `README.md`: 项目说明文档。
- `vercel.json`: Vercel 部署配置文件 (如果使用Vercel)。

## 核心功能 / 模块详解
- **信息采集系统 (前端)**:
    - 采集用户年龄、性别、基础病（糖尿病、高血压、痛风、高血脂等）、忌口（如辛辣、猪肉等）、过敏原信息。
    - 将采集到的信息发送至Web端。
- **智能推荐引擎 (Web端 - `core/recommending.js`, `app.js`)**:
    - **安全过滤**:
        - 根据用户忌口 (`allergy_mask`) 和菜品忌口编码 (`allergen_mask_code`) 过滤。
        - 根据用户健康状况 (`diseases`) 和菜品不适宜编码 (`disease_blacklist_code`) 过滤。
    - **评分系统**:
        - 为符合安全过滤条件的菜品进行评分，评分因素包括：基础分、描述长度、营养素完整度、与用户健康状况的适宜度 (`disease_suitable_code`)、关键词匹配等。
    - **推荐输出**:
        - 按 "荤菜", "素菜", "汤" 三个品类，每个品类推荐一个安全过滤后得分最高的菜品。
    - **API接口 (`/recommend`)**: 接收前端请求，调用推荐逻辑，返回推荐结果。这里也会处理口味偏好 `flavor_preferences`。
    - **API接口 (`/diagnose`)**: 用于诊断和统计忌口信息。
- **推荐结果界面 (前端)**:
    - 接收Web端返回的推荐菜品列表。
    - 展示菜品名称、描述、适宜人群 (`disease_suitable_readable`) 和不适宜情况 (`disease_tags_readable`)。
    - 重点营养素和过敏原警示（根据需求文档，Web端计算并返回，前端展示）。
- **菜品数据管理 (`dishes_recommendation.json`)**:
    - 存储菜品详细信息，包括名称、描述、分类 (`category`)、忌口编码 (`allergen_mask_code`)、不适宜疾病编码 (`disease_blacklist_code`)、适宜疾病编码 (`disease_suitable_code`) 等。

## 数据模型 (以 `dishes_recommendation.json` 中单个菜品为例)
```json
{
  "id": "string (菜品唯一标识)",
  "name": "string (菜品名称)",
  "description": "string (菜品描述)",
  "category": "string (荤菜/素菜/汤)",
  "ingredients": [
    {"name": "string", "quantity": "string"}
  ],
  "price": "number (价格)",
  "image_url": "string (图片链接)",
  "tags": ["string (标签)"],
  "nutrition_facts": {
    "calories": "string",
    "protein": "string (蛋白质)",
    "fat": "string (脂肪)",
    "carbohydrates": "string (碳水化合物)"
    // ... 其他营养成分
  },
  "allergen_mask_code": "number (过敏原/忌口位掩码)",
  "allergen_tags_readable": ["string (可读的过敏原/忌口标签)"],
  "disease_blacklist_code": "number (不适宜疾病位掩码)",
  "disease_tags_readable": ["string (可读的不适宜疾病标签)"],
  "disease_suitable_code": "number (推荐适用疾病位掩码)",
  "disease_suitable_readable": ["string (可读的推荐适用疾病标签)"],
  "flavor_tags": ["string (口味标签，如 '辣', '甜', '清淡'")]
  // ... 其他自定义字段
}
```

## 技术实现细节
[本部分初始为空。在后续开发每一个模块/功能时，AI 会自动将该模块/功能的技术实现方案、关键代码片段说明、API端点设计（如适用）等填充至此。]

## 开发状态跟踪
| 模块/功能                      | 状态        | 负责人 | 计划完成日期 | 实际完成日期 | 备注与链接 (指向技术实现细节锚点) |
|--------------------------------|-------------|--------|--------------|--------------|------------------------------------|
| **概念阶段 (Concept Phase)**     |             |        |              |              |                                    |
| 环境准备与技术选型确认         | 已完成      | AI/用户 | YYYY-MM-DD   | YYYY-MM-DD   |                                    |
| 最简化菜品数据准备             | 已完成      | 用户   | YYYY-MM-DD   | YYYY-MM-DD   | `dishes_recommendation.json`       |
| 核心推荐/过滤逻辑原型实现      | 已完成      | AI     | YYYY-MM-DD   | YYYY-MM-DD   | `core/recommending.js`             |
| 简单输入/输出 API 接口开发     | 已完成      | AI     | YYYY-MM-DD   | YYYY-MM-DD   | `app.js` (`/recommend`, `/filter`) |
| 概念验证界面/脚本与联调        | 已完成      | AI/用户 | YYYY-MM-DD   | YYYY-MM-DD   | `public/`, `test_api.js`          |
| **MVP阶段 (MVP Phase)**        |             |        |              |              |                                    |
| 前后端接口设计与确认           | 已完成      | AI/用户 | YYYY-MM-DD   | YYYY-MM-DD   | API已实现                          |
| 信息采集系统开发 (前端)        | 已完成      | AI     | YYYY-MM-DD   | YYYY-MM-DD   | `public/index.html`, `script.js`   |
| Web端服务与推荐引擎完善        | 已完成      | AI     | YYYY-MM-DD   | YYYY-MM-DD   | `app.js`, `core/recommending.js`   |
| 前后端通信实现与联调           | 已完成      | AI     | YYYY-MM-DD   | YYYY-MM-DD   |                                    |
| 推荐结果界面开发与展示 (前端)  | 已完成      | AI     | YYYY-MM-DD   | YYYY-MM-DD   | `public/index.html`, `script.js`   |
| 基础性能测试与优化             | 待开始      | AI     | YYYY-MM-DD   |              |                                    |
| 部署与集成测试                 | 待开始      | AI/用户 | YYYY-MM-DD   |              |                                    |
| MVP 验证与小范围用户测试       | 待开始      | 用户   | YYYY-MM-DD   |              |                                    |
| **商业阶段 (Commercial Phase)**|             |        |              |              |                                    |
| 性能深度优化 (Web端)           | 待开始      | AI     | YYYY-MM-DD   |              |                                    |
| 高性能基础设施搭建与调优       | 待开始      | AI/用户 | YYYY-MM-DD   |              |                                    |
| 菜品数据管理系统或流程完善     | 待开始      | 用户   | YYYY-MM-DD   |              |                                    |
| 健壮性、日志与监控系统实现     | 待开始      | AI     | YYYY-MM-DD   |              |                                    |
| 全面的自动化测试体系搭建       | 待开始      | AI     | YYYY-MM-DD   |              |                                    |
| 终端适配与用户体验深度优化 (前端)| 待开始      | AI/用户 | YYYY-MM-DD   |              |                                    |
| 安全性加固                     | 待开始      | AI     | YYYY-MM-DD   |              |                                    |
| 最终集成测试、UAT与上线准备    | 待开始      | 用户   | YYYY-MM-DD   |              |                                    |
| 正式上线与持续监控             | 待开始      | 用户   | YYYY-MM-DD   |              |                                    |

## 代码检查与问题记录
[本部分用于记录代码检查结果和开发过程中遇到的问题及其解决方案。]

## 环境设置与运行指南
1.  **确保 Node.js 已安装。** (推荐 LTS 版本)
2.  **克隆项目到本地:**
    ```bash
    git clone <repository_url>
    cd <project_directory>
    ```
3.  **安装项目依赖:**
    ```bash
    npm install
    ```
4.  **启动后端服务:**
    ```bash
    node app.js
    ```
    服务默认运行在 `http://localhost:3001`。
5.  **访问前端页面:**
    在浏览器中打开 `public/index.html` 文件，或通过 Web 服务器访问 (如果配置了)。
6.  **运行API测试脚本 (可选):**
    ```bash
    node test_api.js
    ```

## ......
[可根据项目需要添加其他章节，如部署指南、API详细文档链接、贡献指南等。]
