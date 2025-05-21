/**
 * @file Express 应用入口文件
 * @description 设置 Express 服务器，提供菜品推荐 API。
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const { recommendDishes } = require('./core/recommending');

const app = express();
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

/** * @route POST /recommend * @group Dishes - 菜品推荐操作 * @param {import('./core/recommending').UserInput.model} UserInput.body.required - 用户健康限制输入 * @returns {import('./core/recommending').Dish[]} 200 - 推荐的菜品列表 * @returns {Error}  400 - 请求体格式错误 * @returns {Error}  500 - 服务器内部错误 * @description 接收用户健康状况，返回推荐的菜品列表。 * 用户输入示例: * { *   "diseases": 1, // 例如：糖尿病 *   "allergy_mask": 0, // 可选，忌口掩码 *   "excludeIds": [] // 可选，排除的菜品ID数组 * } */
app.post('/recommend', (req, res) => {
  const userInput = req.body;

  // 基本的输入验证，现在也需要 allergy_mask (如果提供的话)
  if (!userInput || typeof userInput.diseases !== 'number' || 
      (userInput.allergy_mask !== undefined && typeof userInput.allergy_mask !== 'number')) {
    return res.status(400).json({ error: '请求体格式错误，必须包含 "diseases" (number)，可选 "allergy_mask" (number)。' });
  }

  // 为 userInput.allergy_mask 提供默认值0 (无忌口)，如果前端没有传递它
  const completeUserInput = {
    diseases: userInput.diseases,
    allergy_mask: userInput.allergy_mask === undefined ? 0 : userInput.allergy_mask
  };

  try {
    // 获取要排除的菜品ID列表
    const excludeIds = Array.isArray(userInput.excludeIds) ? userInput.excludeIds : [];
    
    // 过滤掉排除的菜品
    let dishesToRecommend = allDishes;
    if (excludeIds.length > 0) {
      console.log(`排除 ${excludeIds.length} 个已推荐的菜品ID:`, excludeIds);
      dishesToRecommend = allDishes.filter(dish => !excludeIds.includes(dish.id));
      console.log(`过滤后剩余 ${dishesToRecommend.length} 个菜品可用于推荐`);
    }
    
    // 使用过滤后的菜品列表进行推荐
    const recommendedDishes = recommendDishes(completeUserInput, dishesToRecommend);
    res.json(recommendedDishes);
  } catch (error) {
    console.error('在 /recommend 路由处理时发生错误:', error);
    res.status(500).json({ error: '服务器在推荐菜品时发生内部错误。' });
  }
});

// 保持对旧API的兼容性
app.post('/filter', (req, res) => {
  const userInput = req.body;

  // 基本的输入验证，现在也需要 allergy_mask (如果提供的话)
  if (!userInput || typeof userInput.diseases !== 'number' || 
      (userInput.allergy_mask !== undefined && typeof userInput.allergy_mask !== 'number')) {
    return res.status(400).json({ error: '请求体格式错误，必须包含 "diseases" (number)，可选 "allergy_mask" (number)。' });
  }

  // 为 userInput.allergy_mask 提供默认值0 (无忌口)，如果前端没有传递它
  const completeUserInput = {
    diseases: userInput.diseases,
    allergy_mask: userInput.allergy_mask === undefined ? 0 : userInput.allergy_mask
  };

  try {
    // 获取要排除的菜品ID列表
    const excludeIds = Array.isArray(userInput.excludeIds) ? userInput.excludeIds : [];
    
    // 过滤掉排除的菜品
    let dishesToRecommend = allDishes;
    if (excludeIds.length > 0) {
      console.log(`排除 ${excludeIds.length} 个已推荐的菜品ID:`, excludeIds);
      dishesToRecommend = allDishes.filter(dish => !excludeIds.includes(dish.id));
      console.log(`过滤后剩余 ${dishesToRecommend.length} 个菜品可用于推荐`);
    }
    
    // 使用过滤后的菜品列表进行推荐
    const recommendedDishes = recommendDishes(completeUserInput, dishesToRecommend);
    res.json(recommendedDishes);
  } catch (error) {
    console.error('在 /filter 路由处理时发生错误:', error);
    res.status(500).json({ error: '服务器在推荐菜品时发生内部错误。' });
  }
});

app.listen(PORT, () => {
  console.log(`服务器正在运行在 http://localhost:${PORT}`);
  console.log(`可以通过 POST 请求 http://localhost:${PORT}/recommend 来测试推荐功能。`);
  console.log('请求体示例: { "diseases": 1 }');
});

module.exports = app; // 导出 app 供测试或其他模块使用 