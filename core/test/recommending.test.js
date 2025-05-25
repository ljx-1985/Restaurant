const { recommendDishes } = require('../recommending');

/**
 * @fileoverview Test suite for recommendDishes function.
 * JSDoc comments added as per custom instructions.
 */

// Mocking console methods for all tests that might use them
let consoleWarnSpy, consoleLogSpy;
beforeEach(() => {
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  consoleWarnSpy.mockRestore();
  consoleLogSpy.mockRestore();
});

// Helper to clone dishes for test isolation
const cloneDishes = (dishes) => JSON.parse(JSON.stringify(dishes));

describe('核心推荐逻辑 - 主要功能及过滤 (UT-CORE-003 & UT-CORE-004)', () => {
  const baseMockDishes = [
    { id: 'm1', name: '红烧肉', category: '荤菜', nutrition: { cal: 500 }, disease_blacklist_code: 1, allergen_mask_code: 0, user_ratings: [5], description: '油腻' },
    { id: 'v1', name: '清炒时蔬', category: '素菜', nutrition: { cal: 100 }, disease_blacklist_code: 2, allergen_mask_code: 4, user_ratings: [4], description: '健康' }, 
    { id: 's1', name: '滋补老鸭汤', category: '汤', nutrition: { cal: 300 }, disease_blacklist_code: 0, allergen_mask_code: 0, user_ratings: [5], description: '滋补' },
    { id: 'm2', name: '香辣牛肉', category: '荤菜', nutrition: { cal: 400 }, disease_blacklist_code: 0, allergen_mask_code: 8, user_ratings: [4], description: '辣' }, 
    { id: 'v2', name: '蒜蓉西兰花', category: '素菜', nutrition: { cal: 120 }, disease_blacklist_code: 0, allergen_mask_code: 0, user_ratings: [3], description: '清淡' },
  ];

  /** @see UT-CORE-003 */
  describe('安全过滤 - 疾病 (UT-CORE-003)', () => {
    test('应根据单一疾病代码过滤菜品', () => {
      const userInput = { diseases: 1, allergy_mask: 0 };
      const result = recommendDishes(userInput, cloneDishes(baseMockDishes));
      const resultIds = result.map(d => d.id);
      expect(resultIds).not.toContain('m1');
      expect(result.some(d => ['v1', 's1', 'm2', 'v2'].includes(d.id))).toBe(true);
    });

    test('应根据多种疾病代码 (位掩码) 过滤菜品', () => {
      const userInput = { diseases: 3, allergy_mask: 0 }; 
      const result = recommendDishes(userInput, cloneDishes(baseMockDishes));
      const resultIds = result.map(d => d.id);
      expect(resultIds).not.toContain('m1');
      expect(resultIds).not.toContain('v1');
      // s1, m2, v2 are safe. One from each category (汤, 荤菜, 素菜) should be chosen.
      // In this case, s1 (汤), m2 (荤菜), v2 (素菜) are the only remaining options for their categories.
      expect(resultIds).toEqual(expect.arrayContaining(['s1', 'm2', 'v2']));
      expect(result.length).toBe(3);
    });

    test('用户无疾病时不应因疾病过滤菜品', () => {
      const userInput = { diseases: 0, allergy_mask: 0 };
      const result = recommendDishes(userInput, cloneDishes(baseMockDishes));
      expect(result.length).toBe(3);
    });
  });

  /** @see UT-CORE-004 */
  describe('安全过滤 - 忌口/过敏原 (UT-CORE-004)', () => {
    test('应根据单一过敏原过滤菜品', () => {
      const userInput = { diseases: 0, allergy_mask: 4 }; 
      const result = recommendDishes(userInput, cloneDishes(baseMockDishes));
      const resultIds = result.map(d => d.id);
      expect(resultIds).not.toContain('v1');
      expect(result.some(d => ['m1', 's1', 'm2', 'v2'].includes(d.id))).toBe(true);
    });

    test('应根据多种过敏原 (位掩码) 过滤菜品', () => {
      const userInput = { diseases: 0, allergy_mask: 12 }; 
      const result = recommendDishes(userInput, cloneDishes(baseMockDishes));
      const resultIds = result.map(d => d.id);
      expect(resultIds).not.toContain('v1');
      expect(resultIds).not.toContain('m2');
      expect(result.some(d => ['m1', 's1', 'v2'].includes(d.id))).toBe(true);
    });

    test('用户无过敏时不应因过敏原过滤菜品', () => {
      const userInput = { diseases: 0, allergy_mask: 0 };
      const result = recommendDishes(userInput, cloneDishes(baseMockDishes));
      expect(result.length).toBe(3);
    });
  });
});

/** @see UT-CORE-005 */
describe('菜品评分机制 (UT-CORE-005)', () => {
  const baseDish = {
    disease_blacklist_code: 0, allergen_mask_code: 0, disease_suitable_code: 0,
    category: '荤菜',
    user_ratings: [3], // Default average rating
  };

  test('多种积极评分特征应优先推荐', () => {
    const dishes = [
      { ...baseDish, id: 'd1', name: '低分菜', nutrition: { cal: 100 }, description: '短' },
      { ...baseDish, id: 'd2', name: '高分菜', nutrition: { cal: 150, protein: 20 }, description: '这是一段足够长的描述来获得额外分数并且包含有益健康的关键词比如高蛋白。', disease_suitable_code: 1, user_ratings: [5,5] },
      { ...baseDish, id: 'd3', name: '中分菜', nutrition: { cal: 120 }, description: '普通描述', user_ratings: [4] }
    ];
    // Assuming health_needs_code in userInput can match disease_suitable_code for bonus
    const userInput = { diseases: 0, allergy_mask: 0, health_needs_code: 1 };
    const result = recommendDishes(userInput, cloneDishes(dishes));
    expect(result.length).toBe(1); // Only one from "测试品类"
    expect(result[0].id).toBe('d2'); // d2 has long desc, more nutrition, suitable code match, high rating
  });

  test('用户评分高的菜品应优先推荐 (其他因素相似时)', () => {
    const dishes = [
      { ...baseDish, id: 'r1', name: '低评分', user_ratings: [1, 2], nutrition: {c:1}, description:"d" },
      { ...baseDish, id: 'r2', name: '高评分', user_ratings: [5, 5, 5], nutrition: {c:1}, description:"d" },
      { ...baseDish, id: 'r3', name: '无评分', user_ratings: [], nutrition: {c:1}, description:"d" },
    ];
    const userInput = { diseases: 0, allergy_mask: 0 };
    const result = recommendDishes(userInput, cloneDishes(dishes));
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('r2');
  });
});

/** @see UT-CORE-006 */
describe('按品类推荐逻辑 (UT-CORE-006)', () => {
  const dishesForCategoryTest = [
    { id: 'm1', name: 'Meat1 Low', category: '荤菜', user_ratings: [], nutrition: {c:1}, disease_blacklist_code:0, allergen_mask_code:0, description:"d" },
    { id: 'm2', name: 'Meat2 High', category: '荤菜', user_ratings: [5], nutrition: {c:1,p:1}, disease_blacklist_code:0, allergen_mask_code:0, description:"absolute best quality meat in town here" },
    { id: 'v1', name: 'Veg1 High', category: '素菜', user_ratings: [5], nutrition: {c:1,f:1}, disease_blacklist_code:0, allergen_mask_code:0, description:"very good veg" },
    { id: 'v2', name: 'Veg2 Low', category: '素菜', user_ratings: [2], nutrition: {c:1}, disease_blacklist_code:0, allergen_mask_code:0, description:"d" },
    { id: 's1', name: 'Soup1 Only', category: '汤', user_ratings: [4], nutrition: {c:1}, disease_blacklist_code:0, allergen_mask_code:0, description:"d" }
  ];

  test('应为每个主要品类返回评分最高的菜品', () => {
    const userInput = { diseases: 0, allergy_mask: 0 };
    const result = recommendDishes(userInput, cloneDishes(dishesForCategoryTest));
    expect(result.length).toBe(3);
    expect(result.find(d => d.category === '荤菜').id).toBe('m2');
    expect(result.find(d => d.category === '素菜').id).toBe('v1');
    expect(result.find(d => d.category === '汤').id).toBe('s1');
  });

  test('当某个品类没有可选菜品时应记录警告并返回其他品类菜品', () => {
    const dishesMissingSoup = dishesForCategoryTest.filter(d => d.category !== '汤');
    const userInput = { diseases: 0, allergy_mask: 0 };
    const result = recommendDishes(userInput, cloneDishes(dishesMissingSoup));
    expect(result.length).toBe(2); // 荤菜, 素菜
    expect(result.some(d => d.category === '汤')).toBe(false);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('汤品类中没有可选的菜品。')); // Adjusted msg
  });

  test('当所有目标品类都没有可选菜品时应返回空数组并记录警告', () => {
    const userInput = { diseases: 0, allergy_mask: 0 };
    // Filter all dishes to be non-matching for common categories, or provide empty array
    const result = recommendDishes(userInput, []);
    expect(result.length).toBe(0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('荤菜品类中没有可选的菜品。')); // Adjusted msg
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('素菜品类中没有可选的菜品。')); // Adjusted msg
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('汤品类中没有可选的菜品。'));   // Adjusted msg
  });
});


// --- Preserved Existing Test Suites (Minor modifications for consistency and to pass) ---
describe('General Behavior, Edge Cases, and Specific Logic (Preserved & Adapted)', () => {
  describe('Empty allDishes array', () => {
    test('should return empty array when allDishes is empty', () => {
      const userInput = { diseases: 1 };
      const result = recommendDishes(userInput, []);
      expect(result).toEqual([]);
    });
  });

  describe('Data Integrity and Warnings', () => {
    test('should use all dishes with warning if no dishes have nutrition data for scoring', () => {
      const userInput = { diseases: 0 };
      const allDishes = [
        { id: 1, name: "Dish1-Meat", category: "荤菜", disease_blacklist_code:0, allergen_mask_code:0, description:"Meat dish" },
        { id: 2, name: "Dish2-Veg", category: "素菜", disease_blacklist_code:0, allergen_mask_code:0, description:"Veg dish" },
        { id: 3, name: "Dish3-Soup", category: "汤", disease_blacklist_code:0, allergen_mask_code:0, description:"Soup dish" }
      ];
      const result = recommendDishes(userInput, cloneDishes(allDishes));
      expect(result.length).toBe(3);
      // Check that all dishes are recommended as their names are present in the result
      const recommendedNames = result.map(d => d.name);
      expect(recommendedNames).toContain('Dish1-Meat');
      expect(recommendedNames).toContain('Dish2-Veg');
      expect(recommendedNames).toContain('Dish3-Soup');

      expect(consoleWarnSpy.mock.calls.length).toBe(1);
      expect(consoleWarnSpy.mock.calls[0][0]).toBe("警告: 没有菜品含有营养素数据，将使用全部菜品");
    });

    test('should filter and warn for invalid disease_blacklist_code format', () => {
      const userInput = { diseases: 1 };
      const allDishes = [{
        id: 1, name: "DishInvalidBlCode", category: "荤菜",
        disease_blacklist_code: "invalid_format", allergen_mask_code: 0,
        nutrition: {c:1}, description:"d"
      }];
      const result = recommendDishes(userInput, cloneDishes(allDishes));
      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '警告：菜品 1 (DishInvalidBlCode) 的 disease_blacklist_code 或 allergen_mask_code 数据格式不正确，已跳过。'
      );
    });

    test('should filter and warn for missing category field', () => {
      const userInput = { diseases: 0 };
      const allDishes = [{ id: 1, name: "DishMissingCat", disease_blacklist_code:0, allergen_mask_code:0, nutrition:{c:1}, description:"d" }];
      const result = recommendDishes(userInput, cloneDishes(allDishes));
      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '警告：菜品 "DishMissingCat" (1) 的 category 字段缺失，已跳过。'
      );
    });

    test('should filter and warn for invalid category value', () => {
      const userInput = { diseases: 0 };
      const allDishes = [{
        id: 1, name: "DishInvalidCatVal", category: "不存在的品类",
        disease_blacklist_code: 0, allergen_mask_code: 0, nutrition:{c:1}, description:"d"
      }];
      const result = recommendDishes(userInput, cloneDishes(allDishes));
      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '警告：菜品 "DishInvalidCatVal" (1) 的 category 字段无效 ("不存在的品类")，已跳过。'
      );
    });
    
    test('should log when a dish is filtered due to disease conflict', () => {
        const userInput = { diseases: 1 };
        const dishes = [{ id: 'd01', name: "Risky Dish", category: "荤菜", disease_blacklist_code: 1, allergen_mask_code:0, nutrition:{c:1}, description:"d" }];
        recommendDishes(userInput, cloneDishes(dishes));
        // The exact log message for filtering might contain more than just this string.
        // Check if the relevant part is present.
        const logCalls = consoleLogSpy.mock.calls;
        const foundLog = logCalls.some(call => call[0].includes('菜品 "Risky Dish" 被过滤掉 (疾病不适宜)'));
        expect(foundLog).toBe(true);
    });

    test('should log when a dish is filtered due to allergy conflict', () => {
        const userInput = { diseases: 0, allergy_mask: 1 };
        const dishes = [{ id: 'a01', name: "Allergen Dish", category: "荤菜", disease_blacklist_code: 0, allergen_mask_code: 1, nutrition:{c:1}, description:"d" }];
        recommendDishes(userInput, cloneDishes(dishes));
        const logCalls = consoleLogSpy.mock.calls;
        const foundLog = logCalls.some(call => call[0].includes('菜品 "Allergen Dish" 被过滤掉 (含过敏原)'));
        expect(foundLog).toBe(true);
    });
  });

  describe('Specific Scoring Component Behaviors (Preserved & Adapted)', () => {
    const baseDish = { category: '荤菜', disease_blacklist_code: 0, allergen_mask_code: 0, disease_suitable_code: 0, user_ratings: [3], nutrition: {calories:100} };
    
    const recommendSingleCategory = (dishes, userInput) => {
        return recommendDishes(userInput, cloneDishes(dishes));
    };

    test('long description should contribute to higher score', () => {
      const userInput = { diseases: 0, allergy_mask: 0 };
      const dishes = [
        { ...baseDish, id: 'short_desc', name: 'Short Desc', description: 'Ok.' },
        { ...baseDish, id: 'long_desc', name: 'Long Desc', description: 'This is a very long and detailed description that should definitely get more points.' }
      ];
      const result = recommendSingleCategory(dishes, userInput);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('long_desc');
    });

    test('more nutrition fields should contribute to higher score', () => {
      const userInput = { diseases: 0, allergy_mask: 0 };
      const dishes = [
        { ...baseDish, id: 'less_nut', name: 'Less Nutrition', nutrition: { calories: 100 }, description:"d" },
        { ...baseDish, id: 'more_nut', name: 'More Nutrition', nutrition: { calories: 100, protein: 20, fiber: 5 }, description:"d" }
      ];
      const result = recommendSingleCategory(dishes, userInput);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('more_nut');
    });

    test('matching disease_suitable_code should be preferred', () => {
      const userInput = { diseases: 0, allergy_mask: 0, health_needs_code: 3 }; 
      const dishes = [
        { ...baseDish, id: 'no_suit', name: 'No Suitable Match', disease_suitable_code: 0, description:"d" },
        { ...baseDish, id: 'yes_suit', name: 'Suitable Match', disease_suitable_code: 3, description:"d" }
      ];
      const result = recommendSingleCategory(dishes, userInput);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('yes_suit');
    });

    test('teenager-related keywords preferred for teenagers', () => {
      const userInput = { diseases: 0, allergy_mask: 0, is_teenager: true };
      const dishes = [
        { ...baseDish, id: 'gen_teen', name: 'Generic', description: '普通菜品', },
        { ...baseDish, id: 'key_teen', name: 'Teenager Special', description: '适合青少年成长, 补充能量' }
      ];
      const result = recommendSingleCategory(dishes, userInput);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('key_teen');
    });

    test('diabetes-friendly keywords preferred for diabetic users (disease_code 1)', () => {
      const userInput = { diseases: 1, allergy_mask: 0 }; 
      const dishes = [
        { ...baseDish, id: 'std_diab', name: 'Standard', description: '美味佳肴', disease_blacklist_code: 0 },
        { ...baseDish, id: 'key_diab', name: 'Diabetes Friendly', description: '低糖选择, 无糖, 适合糖友', disease_blacklist_code: 0 }
      ];
      const result = recommendSingleCategory(dishes, userInput);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('key_diab');
    });
  });
});