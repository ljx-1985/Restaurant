/**
 * @file Express 应用入口文件
 * @description 设置 Express 服务器，提供菜品推荐 API。
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { recommendDishes } = require('./core/recommending');
const helmet = require('helmet');

/**
 * 验证输入字符串是否包含常见的恶意模式
 * @param {string} str 要检查的字符串
 * @returns {boolean} 如果包含恶意模式则返回 true，否则返回 false
 */
function containsMaliciousPatterns(str) {
  if (typeof str !== 'string') return false;
  const patterns = [
    /<script/i,         // 匹配 <script 标签
    /onerror\s*=/i,     // 匹配 onerror=
    /javascript:/i,      // 匹配 javascript: URI scheme
    /<\s*img[^>]+src\s*=[^>]+onerror\s*=/i, // 匹配 <img ... onerror=
    // 可以根据需要添加更多模式
  ];
  return patterns.some(pattern => pattern.test(str));
}

const app = express();

// 使用 helmet 设置安全相关的 HTTP 头
// 这应该在其他中间件和路由之前调用
app.use(helmet());

// 进一步自定义 helmet 的某些选项（如果需要）
// 例如，明确设置 X-Frame-Options 为 DENY
app.use(helmet.frameguard({ action: 'deny' }));
// 注意：helmet() 默认已经包含了 frameguard({ action: 'sameorigin' })
// 如果你想强制 DENY，可以像上面这样单独设置，或者配置 helmet 整体策略。
// 对于 X-Content-Type-Options: nosniff，helmet() 默认就会设置。

const PORT = process.env.PORT || 3001;

// 中间件，用于解析请求体中的 JSON 数据
app.use(express.json());

// 提供 public 目录下的静态文件（使用绝对路径）
app.use(express.static(path.join(__dirname, 'public')));

// 菜品数据路径
const dishesPath = path.join(__dirname, 'dishes.json');

/**
 * @type {import('./core/recommending').Dish[]}
 */
let allDishes = [];

// 启动时加载菜品数据
try {
  const dishesData = fs.readFileSync(dishesPath, 'utf8');
  allDishes = JSON.parse(dishesData);
  console.log(`成功加载 ${allDishes.length} 条菜品数据从 ${dishesPath}`);
} catch (error) {
  console.error(`从 ${dishesPath} 加载菜品数据失败:`, error);
  // 在无法加载菜品数据时，可以决定是否终止应用或使用空数据启动
  // process.exit(1); // 如果这是关键数据，则终止应用
}

// 测试路由
app.get('/test', (req, res) => {
  res.send('测试路由正常工作！');
});

// 明确定义根路由，直接提供 index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 明确定义 /index.html 路由
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 添加一个诊断路由，查看菜品数据
app.get('/diagnose', (req, res) => {
  const nutritionStats = {
    withNutrition: 0,
    withoutNutrition: 0
  };
  const diseaseStats = {};
  const diseaseSuitableStats = {};
  
  allDishes.forEach(dish => {
    if (dish.nutrition && Object.keys(dish.nutrition).length > 0) {
      nutritionStats.withNutrition++;
    } else {
      nutritionStats.withoutNutrition++;
    }
    if (typeof dish.disease_blacklist_code === 'number') {
      diseaseStats[dish.disease_blacklist_code] = (diseaseStats[dish.disease_blacklist_code] || 0) + 1;
    }
    if (typeof dish.disease_suitable_code === 'number') {
      diseaseSuitableStats[dish.disease_suitable_code] = (diseaseSuitableStats[dish.disease_suitable_code] || 0) + 1;
    }
  });
  
  const sampleDishes = allDishes.slice(0, 5).map(dish => ({
    id: dish.id,
    name: dish.name,
    disease_blacklist_code: dish.disease_blacklist_code,
    disease_suitable_code: dish.disease_suitable_code,
    disease_tags_readable: dish.disease_tags_readable,
    disease_suitable_readable: dish.disease_suitable_readable || [],
    has_nutrition: dish.nutrition && Object.keys(dish.nutrition).length > 0
  }));
  
  const populationStats = {
    '糖尿病(1)': allDishes.filter(dish => (dish.disease_suitable_code & 1) !== 0).length,
    '高血压(2)': allDishes.filter(dish => (dish.disease_suitable_code & 2) !== 0).length,
    '痛风(4)': allDishes.filter(dish => (dish.disease_suitable_code & 4) !== 0).length,
    '高血脂(8)': allDishes.filter(dish => (dish.disease_suitable_code & 8) !== 0).length,
    '青少年(16)': allDishes.filter(dish => (dish.disease_suitable_code & 16) !== 0).length,
    '孕产妇(32)': allDishes.filter(dish => (dish.disease_suitable_code & 32) !== 0).length,
    '老年(64)': allDishes.filter(dish => (dish.disease_suitable_code & 64) !== 0).length
  };
  
  res.json({
    totalDishes: allDishes.length,
    nutritionStats,
    diseaseStats,
    diseaseSuitableStats,
    populationStats,
    sampleDishes
  });
});

/** * @route POST /recommend * @group Dishes - 菜品推荐操作 * @param {import('./core/recommending').UserInput.model} UserInput.body.required - 用户健康限制输入 * @returns {import('./core/recommending').Dish[]} 200 - 推荐的菜品列表 * @returns {Error}  400 - 请求体格式错误 * @returns {Error}  500 - 服务器内部错误 * @description 接收用户健康状况，返回推荐的菜品列表。 * 用户输入示例: * { *   "diseases": 1, // 例如：糖尿病 *   "allergy_mask": 0, // 可选，忌口掩码 *   "preferences": ["some preference", "another preference"], // 可选，偏好字符串数组 *   "excludeIds": [] // 可选，排除的菜品ID数组 * } */
app.post('/recommend', (req, res) => {
  console.log('--- /recommend route hit ---'); // 添加日志确认路由被访问
  const { diseases, allergy_mask, preferences, health_needs_code, flavor_preferences, excludeIds } = req.body;

  // 基本的输入验证
  if (typeof diseases !== 'number' || 
      (allergy_mask !== undefined && typeof allergy_mask !== 'number')) {
    return res.status(400).json({ error: '请求体格式错误，必须包含 "diseases" (number)，可选 "allergy_mask" (number)。' });
  }

  // 验证 preferences 字段（如果存在）
  if (preferences) {
    if (!Array.isArray(preferences)) {
      return res.status(400).json({ error: '"preferences" 字段必须是一个数组。' });
    }
    for (const pref of preferences) {
      if (typeof pref !== 'string') {
        return res.status(400).json({ error: '"preferences" 数组中的元素必须是字符串。' });
      }
      if (containsMaliciousPatterns(pref)) {
        return res.status(400).json({ error: '"preferences" 字段包含不允许的模式。' });
      }
    }
  }

  // 新增：验证 flavor_preferences 字段 (如果存在)
  if (flavor_preferences) {
    if (!Array.isArray(flavor_preferences)) {
      return res.status(400).json({ error: '"flavor_preferences" 字段必须是一个数组。' });
    }
    for (const flavor_pref of flavor_preferences) {
      if (typeof flavor_pref !== 'string') {
        return res.status(400).json({ error: '"flavor_preferences" 数组中的元素必须是字符串。' });
      }
      // 可选：如果口味偏好字符串也需要检查恶意模式，可以在这里添加
      // if (containsMaliciousPatterns(flavor_pref)) {
      //   return res.status(400).json({ error: '"flavor_preferences" 字段包含不允许的模式。' });
      // }
    }
  }

  // 构建传递给核心推荐逻辑的对象
  const completeUserInput = {
    diseases: diseases,
    allergy_mask: allergy_mask === undefined ? 0 : allergy_mask,
    preferences: preferences || [],
    health_needs_code: health_needs_code,
    flavor_preferences: flavor_preferences || []
  };

  try {
    console.time('recommend_total_duration'); // 开始计时整个 /recommend 请求处理
    // 获取要排除的菜品ID列表
    const currentExcludeIds = Array.isArray(excludeIds) ? excludeIds : [];
    
    let dishesToRecommend = allDishes;
    if (currentExcludeIds.length > 0) {
      console.time('recommend_exclude_filter_duration'); // 开始计时排除ID的过滤
      console.log(`排除 ${currentExcludeIds.length} 个已推荐的菜品ID:`, currentExcludeIds);
      dishesToRecommend = allDishes.filter(dish => !currentExcludeIds.includes(dish.id));
      console.log(`过滤后剩余 ${dishesToRecommend.length} 个菜品可用于推荐`);
      console.timeEnd('recommend_exclude_filter_duration'); // 结束计时排除ID的过滤
    }
    
    // 使用过滤后的菜品列表进行推荐
    console.time('recommend_recommendDishes_call_duration'); // 开始计时 recommendDishes 函数调用
    const recommendedDishes = recommendDishes(completeUserInput, dishesToRecommend);
    console.timeEnd('recommend_recommendDishes_call_duration'); // 结束计时 recommendDishes 函数调用
    res.json(recommendedDishes);
    console.timeEnd('recommend_total_duration'); // 结束计时整个 /recommend 请求处理
  } catch (error) {
    console.error('在 /recommend 路由处理时发生错误:', error);
    console.timeEnd('recommend_total_duration'); // 确保在错误时也结束计时
    res.status(500).json({ error: '服务器在推荐菜品时发生内部错误。' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`服务器正在运行在 http://localhost:${PORT}`);
  console.log(`可以通过 POST 请求 http://localhost:${PORT}/recommend 来测试推荐功能。`);
  console.log('请求体示例: { "diseases": 1 }');
});

module.exports = { app: app, server: server }; 