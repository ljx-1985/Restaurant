/**
 * 将dishes_sample.json转换为带有推荐人群信息的dishes_recommendation.json
 * 
 * 添加以下字段:
 * - disease_suitable_code: 菜品适合的人群编码(位掩码)
 * - disease_suitable_readable: 菜品适合的人群可读标签
 */

const fs = require('fs');
const path = require('path');

// 文件路径
const sourcePath = path.join(__dirname, 'dishes_sample.json');
const targetPath = path.join(__dirname, 'dishes_recommendation.json');

// 7类人群及其对应的md文件
const populationFiles = {
  '糖尿病': {
    code: 1,
    path: path.join(__dirname, '糖尿病.md')
  },
  '高血压': {
    code: 2,
    path: path.join(__dirname, '高血压.md')
  },
  '痛风': {
    code: 4,
    path: path.join(__dirname, '痛风.md')
  },
  '高血脂': {
    code: 8,
    path: path.join(__dirname, '高血脂.md')
  },
  '青少年': {
    code: 16,
    path: path.join(__dirname, '青少年.md')
  },
  '孕产妇': {
    code: 32,
    path: path.join(__dirname, '孕产妇.md')
  },
  '老年': {
    code: 64,
    path: path.join(__dirname, '老年.md')
  }
};

// 手动添加的常见菜品与人群匹配
const manualDishMatches = {
  '清炒时蔬': ['糖尿病', '高血压', '痛风', '高血脂', '青少年', '孕产妇', '老年'],
  '蒜蓉西兰花': ['糖尿病', '高血压', '高血脂', '老年'],
  '清蒸鱼': ['糖尿病', '高血压', '高血脂', '老年'],
  '白灼菜心': ['糖尿病', '高血压', '痛风', '高血脂'],
  '芹菜炒肉丝': ['高血压'],
  '拍黄瓜': ['糖尿病', '高血压', '痛风', '高血脂'],
  '番茄烩豆腐': ['高血压', '孕产妇'],
  '蒜蓉蒸娃娃菜': ['高血压'],
  '清炖鲫鱼汤': ['高血压'],
  '香菇滑鸡': ['高血压', '高血脂', '青少年'],
  '清蒸鳕鱼': ['高血脂', '老年', '孕产妇'],
  '木耳炒山药': ['高血脂', '老年'],
  '蒸蛋羹': ['痛风', '青少年'],
  '凉拌木耳': ['痛风']
};

// 读取各人群的推荐菜品
function readPopulationDishes() {
  const populationDishes = {};
  
  // 初始化人群数据
  for (const [population, info] of Object.entries(populationFiles)) {
    populationDishes[population] = {
      code: info.code,
      dishes: []
    };
  }
  
  // 添加手动匹配的菜品
  for (const [dishName, populations] of Object.entries(manualDishMatches)) {
    for (const population of populations) {
      if (populationDishes[population]) {
        populationDishes[population].dishes.push(dishName);
      }
    }
  }
  
  // 读取MD文件中的菜品
  for (const [population, info] of Object.entries(populationFiles)) {
    try {
      if (fs.existsSync(info.path)) {
        const content = fs.readFileSync(info.path, 'utf8');
        const dishNames = extractDishNames(content);
        
        // 合并菜品列表，避免重复
        const existingDishes = new Set(populationDishes[population].dishes);
        for (const dish of dishNames) {
          existingDishes.add(dish);
        }
        
        populationDishes[population].dishes = Array.from(existingDishes);
        console.log(`成功读取${population}人群文档，找到${populationDishes[population].dishes.length}个推荐菜品`);
      } else {
        console.warn(`警告: ${population}人群文档不存在: ${info.path}`);
      }
    } catch (error) {
      console.error(`读取${population}人群文档失败:`, error);
    }
  }
  
  return populationDishes;
}

// 从md文件提取菜品名称
function extractDishNames(content) {
  // 匹配文件中的菜品名称，一般是每段的第一行
  const lines = content.split('\n');
  const dishes = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // 跳过空行、以✅开头的行、带有营养标签的行
    if (line && !line.includes('✅') && !line.includes('营养标签')) {
      // 跳过标题和明显不是菜名的行
      if (line.length > 0 && 
          line.length < 30 && 
          !line.includes('#') && 
          !line.includes('http') && 
          !line.includes('适合人群')) {
        dishes.push(line.replace(/\s+$/, '')); // 移除尾部空格
      }
    }
  }
  
  return dishes;
}

// 更新菜品数据
function updateDishes() {
  try {
    // 读取原始菜品数据
    const dishesContent = fs.readFileSync(sourcePath, 'utf8');
    const dishes = JSON.parse(dishesContent);
    console.log(`成功读取${dishes.length}个菜品数据`);
    
    // 读取各人群的推荐菜品
    const populationDishes = readPopulationDishes();
    
    // 更新每个菜品
    const updatedDishes = dishes.map(dish => {
      // 创建菜品副本
      const updatedDish = { ...dish };
      
      // 初始化推荐编码和标签
      updatedDish.disease_suitable_code = 0;
      updatedDish.disease_suitable_readable = [];
      
      // 遍历各人群，检查菜品是否在推荐列表中
      for (const [population, info] of Object.entries(populationDishes)) {
        // 检查菜品名称完全匹配
        const isExactMatch = info.dishes.some(name => 
          name.trim().toLowerCase() === dish.name.trim().toLowerCase());
        
        // 检查菜品名称部分匹配 (处理括号、空格等)
        const isPartialMatch = info.dishes.some(name => {
          const dishNameLower = dish.name.trim().toLowerCase();
          const nameLower = name.trim().toLowerCase();
          
          // 处理带括号的情况: "清蒸鳕鱼 (粤菜)" -> "清蒸鳕鱼"
          if (nameLower.includes('(')) {
            const baseName = nameLower.split('(')[0].trim();
            if (dishNameLower === baseName) return true;
          }
          
          // 两个菜名都包含同样的主要部分
          if (dishNameLower.includes(nameLower) || nameLower.includes(dishNameLower)) {
            return true;
          }
          
          return false;
        });
        
        // 根据菜品描述中的关键词进行匹配
        const description = (dish.description || '').toLowerCase();
        const descriptionMatch = 
          description.includes(`${population}人群适宜`) || 
          description.includes(`适合${population}`) ||
          description.includes(`${population}适宜`) ||
          description.includes(`${population}营养特点`);
        
        if (isExactMatch || isPartialMatch || descriptionMatch) {
          updatedDish.disease_suitable_code |= info.code;
          updatedDish.disease_suitable_readable.push(`${population}适宜`);
          console.log(`菜品 "${dish.name}" 匹配${population}人群 (${isExactMatch ? '精确匹配' : isPartialMatch ? '部分匹配' : '描述匹配'})`);
        }
      }
      
      return updatedDish;
    });
    
    // 写入更新后的数据
    fs.writeFileSync(targetPath, JSON.stringify(updatedDishes, null, 2), 'utf8');
    console.log(`成功更新${updatedDishes.length}个菜品数据，保存至${targetPath}`);
    
    // 输出统计信息
    const stats = {};
    for (const [population, info] of Object.entries(populationDishes)) {
      const count = updatedDishes.filter(dish => (dish.disease_suitable_code & info.code) !== 0).length;
      stats[population] = count;
    }
    
    console.log('各人群推荐菜品数量统计:');
    for (const [population, count] of Object.entries(stats)) {
      console.log(`- ${population}: ${count}/${updatedDishes.length} (${Math.round(count / updatedDishes.length * 100)}%)`);
    }
    
  } catch (error) {
    console.error('更新菜品数据失败:', error);
  }
}

// 执行更新
updateDishes(); 