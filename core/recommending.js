/**
 * @typedef {object} Dish - 菜品对象结构
 * @property {string} id - 菜品ID
 * @property {string} name - 菜品名称
 * @property {string} category - 菜品品类 ("荤菜", "素菜", "汤")
 * @property {string} description - 菜品描述
 * @property {number} disease_blacklist_code - 疾病/人群限制编码 (位掩码)，标记菜品不适宜的情况。
 * @property {number} disease_suitable_code - 疾病/人群推荐编码 (位掩码)，标记菜品适合的情况。
 * @property {string[]} [disease_tags_readable] - 可读的疾病/人群不适宜标签 (可选)
 * @property {string[]} [disease_suitable_readable] - 可读的疾病/人群适宜标签 (可选)
 * @property {string[]} [population_tags_readable] - 可读的人群标签 (可选)
 * @property {object} [nutrition] - 菜品的营养素数据 (可选)
 * // ... 其他菜品属性
 */

/**
 * @typedef {object} UserInput - 用户健康限制输入对象结构
 * @property {number} diseases - 用户基础情况的编码 (位掩码)，包括疾病和特殊人群。
 * @property {number} [allergy_mask] - 用户的忌口编码 (位掩码)，可选。
 * // 后续可能根据需求文档扩展，例如：口味偏好等。
 */

/**
 * 基础情况的编码映射：
 * 0: 无
 * 1: 糖尿病
 * 2: 高血压
 * 4: 痛风
 * 8: 高血脂
 * 16: 青少年
 * 32: 孕产妇
 * 64: 老年
 */

/**
 * 根据用户偏好和菜品数据推荐菜品。
 * @param {object} userPreferences 用户偏好，包含 diseases (number), allergy_mask (number), preferences (string[]), flavor_preferences (string[] | undefined)
 * @param {object[]} allDishes 所有菜品数据的数组。
 * @param {boolean} skipCategoryLogging 是否跳过品类日志记录（用于测试）
 * @returns {object[]} 推荐菜品列表。
 */
function recommendDishes(userPreferences, allDishes, skipCategoryLogging = false) {
  const { diseases, allergy_mask, preferences, flavor_preferences } = userPreferences;

  console.log("用户输入:", userPreferences);

  if (!userPreferences || typeof diseases !== 'number' || (allergy_mask !== undefined && typeof allergy_mask !== 'number')) {
    console.error("错误：用户输入格式不正确。userPreferences:", userPreferences);
    return []; 
  }
  if (!Array.isArray(allDishes)) {
    console.error("错误：菜品数据格式不正确。allDishes 应该是一个数组。");
    return [];
  }

  // 定义目标品类
  const CATEGORIES_ORDER = ["荤菜", "素菜", "汤"]; // 定义品类顺序

  // 如果一开始就没有菜品输入，则为每个品类记录警告并返回
  if (allDishes.length === 0) {
    console.log("警告: 输入的菜品列表为空。");
    CATEGORIES_ORDER.forEach(category => {
      console.warn(`警告：${category}品类中没有可选的菜品。`);
    });
    return [];
  }

  // 输出总菜品数量
  console.log("总菜品数量:", allDishes.length);

  // 输出每个品类的菜品数量，用于诊断
  const categoryCounts = {};
  allDishes.forEach(dish => {
    if (dish.category) {
      categoryCounts[dish.category] = (categoryCounts[dish.category] || 0) + 1;
    } else {
      categoryCounts['无类别'] = (categoryCounts['无类别'] || 0) + 1;
    }
  });
  console.log("各品类菜品数量:", categoryCounts);

  // 过滤掉没有营养素数据的菜品
  const dishesWithNutrition = allDishes.filter(dish => {
    return dish.nutrition && Object.keys(dish.nutrition).length > 0;
  });

  // 输出有营养素的菜品数量
  console.log("含营养素数据的菜品数量:", dishesWithNutrition.length);

  // 如果没有菜品含有营养素数据，则使用全部菜品
  let dishesToProcess = dishesWithNutrition;
  if (dishesToProcess.length === 0) {
    console.warn("警告: 没有菜品含有营养素数据，将使用全部菜品");
    dishesToProcess = allDishes;
  }

  // 首先剔除绝对不适合的菜品（安全性考虑）
  const safetyFilteredDishes = dishesToProcess.filter(dish => {
    // 检查菜品数据是否符合预期结构
    if (typeof dish.disease_blacklist_code !== 'number' || (dish.allergen_mask_code !== undefined && typeof dish.allergen_mask_code !== 'number')) {
      console.warn(`警告：菜品 ${dish.id || '未知ID'} (${dish.name || '未知名称'}) 的 disease_blacklist_code 或 allergen_mask_code 数据格式不正确，已跳过。`);
      return false; 
    }
    // 增加对 category 字段的检查
    if (!dish.category) {
      console.warn(`警告：菜品 "${dish.name}" (${dish.id || '未知ID'}) 的 category 字段缺失，已跳过。`);
      return false;
    }
    
    if (!CATEGORIES_ORDER.includes(dish.category)) {
      console.warn(`警告：菜品 "${dish.name}" (${dish.id || '未知ID'}) 的 category 字段无效 ("${dish.category}")，已跳过。`);
      return false;
    }

    // 检查基础情况限制（禁忌表逻辑）
    const isDiseaseSafe = (dish.disease_blacklist_code & diseases) === 0;

    // 检查忌口限制
    // 如果用户传入了 allergy_mask，并且菜品也有 allergen_mask_code，则进行比较
    // 如果菜品没有 allergen_mask_code (假设为0或undefined)，则默认通过忌口检查 (除非用户忌口为0)
    let isAllergySafe = true;
    if (allergy_mask !== undefined && allergy_mask !== 0) {
      if (dish.allergen_mask_code !== undefined) {
        isAllergySafe = (dish.allergen_mask_code & allergy_mask) === 0;
      } else {
        // 如果菜品没有忌口信息，而用户有忌口选择（非0），则视为不安全，除非特定场景另有定义
        // 为保守起见，如果用户有忌口，但菜品无忌口信息，则不推荐
        // isAllergySafe = false; // 或者根据产品需求决定
        // 修正：如果菜品没有allergen_mask_code，我们应该假定它不含用户选择的忌口，除非我们有明确信息
        // 然而，更安全的做法是，如果用户有忌口，而菜品没有忌口信息，则不推荐，防止信息缺失导致问题。
        // 但根据现有逻辑，如果allergen_mask_code不存在，则不应阻止推荐。
        // 我们假设 allergen_mask_code 为 0 （无忌口）如果它未定义
        isAllergySafe = ((dish.allergen_mask_code || 0) & allergy_mask) === 0;
      }
    }

    // 记录过滤条件，如果菜品被过滤掉
    if (!isDiseaseSafe || !isAllergySafe) {
      let reason = "";
      if (!isDiseaseSafe) reason += "(疾病不适宜)";
      if (!isAllergySafe) reason += (reason ? " " : "") + "(含过敏原)";

      console.log(`菜品 \"${dish.name}\" 被过滤掉 ${reason} - disease安全: ${isDiseaseSafe}, allergy安全: ${isAllergySafe}, 菜品数据:`, {
        disease_blacklist_code: dish.disease_blacklist_code,
        allergen_mask_code: dish.allergen_mask_code,
        user_diseases: diseases,
        user_allergy_mask: allergy_mask
      });
    }

    return isDiseaseSafe && isAllergySafe;
  });

  console.log("安全过滤后的菜品数量 (包括忌口):", safetyFilteredDishes.length);
  
  // 按品类统计过滤后的菜品数量
  const filteredCategoryCounts = {};
  safetyFilteredDishes.forEach(dish => {
    filteredCategoryCounts[dish.category] = (filteredCategoryCounts[dish.category] || 0) + 1;
  });
  console.log("安全过滤后各品类菜品数量:", filteredCategoryCounts);

  // 如果过滤后没有菜品，则返回空数组
  if (safetyFilteredDishes.length === 0) {
    console.log("警告: 过滤后没有适合的菜品");
    return [];
  }

  // 新增：口味偏好过滤
  let flavorFilteredDishes = safetyFilteredDishes;
  if (flavor_preferences && flavor_preferences.length > 0) {
    flavorFilteredDishes = safetyFilteredDishes.filter(dish => {
      if (!dish.flavor_tags || dish.flavor_tags.length === 0) {
        // 如果菜品没有口味标签，根据讨论，当用户指定了口味偏好时，
        // 这些没有明确口味的菜品应该被保留，因为无法判断它们是否与用户偏好冲突。
        return true; // 修正：没有口味标签的菜品在用户指定偏好时予以保留
      }
      // 如果菜品有口味标签，则检查是否至少有一个标签与用户偏好匹配
      return dish.flavor_tags.some(tag => flavor_preferences.includes(tag));
    });
    console.log(`口味偏好过滤后，剩下 ${flavorFilteredDishes.length} 道菜。`);
    if (flavorFilteredDishes.length < safetyFilteredDishes.length) {
        const diff = safetyFilteredDishes.filter(x => !flavorFilteredDishes.includes(x));
        // 避免在测试中打印过多日志，仅当ID存在时打印
        if (diff.length > 0 && diff[0] && diff[0].id) { 
            console.log(`因口味偏好被过滤掉的菜品ID示例: ${diff.slice(0,5).map(d => d.id).join(', ')}`);
        }
    }
  } else {
    if (!skipCategoryLogging) console.log('用户未指定口味偏好，跳过口味过滤。');
  }

  // 为每个菜品计算推荐得分
  const scoredDishes = flavorFilteredDishes.map(dish => {
    let score = dish.base_score || 50; 
    const description = (dish.description || '').toLowerCase();

    // 1. 根据菜品描述长度加分 - 描述越丰富，信息越完整
    if (dish.description) {
      const descriptionLength = dish.description.length;
      score += Math.min(descriptionLength / 20, 10); // 最多加10分
    }

    // 2. 根据营养素数据完整度加分
    if (dish.nutrition) {
      const nutritionKeys = Object.keys(dish.nutrition);
      const nonZeroValues = Object.values(dish.nutrition).filter(val => val > 0).length;
      score += nonZeroValues * 2; // 每个非零营养素加2分
    }

    // 3. 推荐表逻辑 - 如果菜品明确标记为适合用户的情况，大幅加分
    // 用户健康需求码，优先使用 health_needs_code, 否则使用 diseases
    const userNeedsCode = userPreferences.health_needs_code !== undefined ? userPreferences.health_needs_code : diseases;
    if (dish.disease_suitable_code && userNeedsCode && (dish.disease_suitable_code & userNeedsCode) !== 0) {
      // 计算匹配的人群数量（有多少个1位匹配）
      let matchingConditions = 0;
      let tempUserNeeds = userNeedsCode;
      let tempDishSuitable = dish.disease_suitable_code;
      
      while (tempUserNeeds > 0 && tempDishSuitable > 0) {
        if ((tempUserNeeds & 1) && (tempDishSuitable & 1)) {
          matchingConditions++;
        }
        tempUserNeeds >>= 1;
        tempDishSuitable >>= 1;
      }
      
      // 每匹配一个人群加15分
      score += matchingConditions * 15;
      
      console.log(`菜品 \"${dish.name}\" 匹配了${matchingConditions}个推荐人群 (基于 userNeedsCode: ${userNeedsCode})，加分: ${matchingConditions * 15}`);
    }

    // 4. 特殊人群相关推荐（基于描述中的关键词）
    // 青少年(16)
    if ((diseases & 16) !== 0) {
      if (description.includes('适合青少年') || description.includes('青少年营养') || 
          description.includes('有利于成长') || description.includes('促进发育')) {
        score += 10;
      }
    }

    // 孕产妇(32)
    if ((diseases & 32) !== 0) {
      if (description.includes('适合孕产妇') || description.includes('孕产妇营养') || 
          description.includes('富含叶酸') || description.includes('补充铁质') ||
          description.includes('孕期') || description.includes('哺乳期')) {
        score += 10;
      }
    }

    // 老年人(64)
    if ((diseases & 64) !== 0) {
      if (description.includes('适合老年') || description.includes('老年营养') || 
          description.includes('容易消化') || description.includes('软烂易嚼')) {
        score += 10;
      }
    }

    // 5. 疾病相关推荐（基于描述中的关键词）
    // 糖尿病(1)
    if ((diseases & 1) !== 0) {
      if (description.includes('低糖') || description.includes('糖尿病适宜') || 
          description.includes('血糖控制')) {
        score += 10;
      }
    }

    // 高血压(2)
    if ((diseases & 2) !== 0) {
      if (description.includes('低钠') || description.includes('少盐') || 
          description.includes('高血压适宜') || description.includes('降压')) {
        score += 10;
      }
    }

    // 痛风(4)
    if ((diseases & 4) !== 0) {
      if (description.includes('低嘌呤') || description.includes('痛风适宜') || 
          description.includes('植物蛋白')) {
        score += 10;
      }
    }

    // 高血脂(8)
    if ((diseases & 8) !== 0) {
      if (description.includes('低脂') || description.includes('高血脂适宜') || 
          description.includes('不含反式脂肪') || description.includes('低胆固醇')) {
        score += 10;
      }
    }

    // 6. 根据用户平均评分加分
    if (dish.user_ratings && dish.user_ratings.length > 0) {
      const sum = dish.user_ratings.reduce((acc, rating) => acc + rating, 0);
      const averageRating = sum / dish.user_ratings.length;
      if (averageRating >= 4.5) {
        score += 15;
      } else if (averageRating >= 4.0) {
        score += 10;
      } else if (averageRating >= 3.0) {
        score += 5;
      }
      console.log(`菜品 "${dish.name}" 平均分 ${averageRating.toFixed(1)}，加分基于评分。`);
    }

    return { ...dish, recommendScore: Math.min(score, 100) };
  });

  const MAIN_COURSE_CATEGORIES = ["荤菜", "素菜", "汤"];
  const recommendationsByCategory = {};

  MAIN_COURSE_CATEGORIES.forEach(category => {
    // 从已经过安全过滤和口味过滤，并且已评分的菜品中筛选当前品类
    const categoryDishes = scoredDishes.filter(dish => dish.category === category);

    if (categoryDishes.length > 0) {
      // 直接对这些菜品按分数降序排序，因为它们已经通过了口味偏好过滤（如果用户指定了偏好）
      categoryDishes.sort((a, b) => b.recommendScore - a.recommendScore);
      recommendationsByCategory[category] = categoryDishes[0];
      if (!skipCategoryLogging) {
        console.log(`品类 [${category}] 推荐: ${categoryDishes[0].name} (得分: ${categoryDishes[0].recommendScore})`);
      }
    } else {
      if (!skipCategoryLogging) {
        console.warn(`警告：${category}品类中没有可选的菜品。`);
      }
    }
  });

  const finalRecommendations = Object.values(recommendationsByCategory);

  console.log("按品类推荐菜品:", finalRecommendations.map(dish => `${dish.name} (品类: ${dish.category})`));
  if (finalRecommendations.length > 0) {
    console.log("对应得分:", finalRecommendations.map(dish => {
        const scoredDish = scoredDishes.find(sd => sd.id === dish.id);
        return scoredDish ? `${dish.name}: ${scoredDish.recommendScore}` : `${dish.name}: (未找到分数)`;
    }));
  }
  
  return finalRecommendations;
}

module.exports = {
  recommendDishes,
}; 