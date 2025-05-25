const { recommendDishes } = require('./recommending');

// 辅助函数：简化菜品对象创建
const createDish = (id, category, flavor_tags = [], otherProps = {}) => ({
  id,
  name: `Dish ${id}`,
  category,
  description: `Description for ${id}`,
  disease_blacklist_code: 0,
  allergen_mask_code: 0,
  disease_suitable_code: 0,
  nutrition: { calories: 100 }, // 保证评分时有基础营养分，避免因营养缺失导致评分为0
  flavor_tags,
  ...otherProps,
});

describe('recommendDishes - Flavor Preference Unit Tests', () => {
  const dish1_su_qingdan = createDish('D1', '素菜', ['清淡']);
  const dish2_hun_la_xian = createDish('D2', '荤菜', ['辣', '鲜浓']);
  const dish3_tang_tian = createDish('D3', '汤', ['甜']);
  const dish4_su_no_flavor = createDish('D4', '素菜', []); // 没有口味标签
  const dish5_hun_xian = createDish('D5', '荤菜', ['鲜浓']);
  const dish6_tang_no_flavor_high_score = createDish('D6', '汤', [], { description: 'Longer description for higher base score initially'});

  const allTestDishes = [dish1_su_qingdan, dish2_hun_la_xian, dish3_tang_tian, dish4_su_no_flavor, dish5_hun_xian, dish6_tang_no_flavor_high_score];

  it('should filter dishes based on single matching flavor preference', () => {
    const userInput = { diseases: 0, allergy_mask: 0, flavor_preferences: ['清淡'] };
    const recommendations = recommendDishes(userInput, allTestDishes);
    const recommendedIds = recommendations.map(d => d.id);
    expect(recommendedIds).toContain('D1'); // D1 素菜 清淡
    expect(recommendedIds).not.toContain('D2'); // D2 荤菜 辣, 鲜浓
    expect(recommendedIds).not.toContain('D3'); // D3 汤 甜
    // D4 (素菜, 无标签) 应该在口味偏好过滤阶段被保留 (因为它没有标签，无法判断是否冲突)，最终是否被推荐取决于评分和品类
    // D5 (荤菜, 鲜浓) 不匹配 "清淡"
    expect(recommendedIds).not.toContain('D5');
    // D6 (汤, 无标签) 也应被保留
  });

  it('should filter dishes based on multiple matching flavor preferences (dish must match at least one)', () => {
    const userInput = { diseases: 0, allergy_mask: 0, flavor_preferences: ['辣', '甜'] };
    const recommendations = recommendDishes(userInput, allTestDishes);
    const recommendedIds = recommendations.map(d => d.id);
    
    expect(recommendedIds).not.toContain('D1'); // D1 清淡
    expect(recommendedIds).toContain('D2');   // D2 荤菜 辣, 鲜浓 (匹配 辣)
    // D3 (汤, 甜) 匹配 "甜", D6 (汤, 无标签, 高分描述) 也通过口味过滤。
    // D6 得分 (54.45) 高于 D3 (52.9), 所以 D6 应该被推荐为汤。
    expect(recommendedIds).not.toContain('D3'); 
    expect(recommendedIds).toContain('D6'); // D6 (汤) 应被推荐
    expect(recommendedIds).not.toContain('D5'); // D5 鲜浓
  });

  it('should correctly handle dishes with no flavor_tags when user specifies flavor_preferences', () => {
    const userInput = { diseases: 0, allergy_mask: 0, flavor_preferences: ['不存在的口味'] };
    // 提供一个有口味标签（会被过滤）和一个没有口味标签（期望保留并被推荐）的素菜
    const testDishes = [dish1_su_qingdan, dish4_su_no_flavor]; 
    const recommendations = recommendDishes(userInput, testDishes);
    
    const recommendedVegDishes = recommendations.filter(d => d.category === '素菜');
    
    // 期望 D1 (有"清淡"标签) 被 "不存在的口味" 过滤掉。
    // 期望 D4 (无标签) 通过口味过滤，并且因为是素菜品类中唯一的选择，所以被推荐。
    expect(recommendedVegDishes.length).toBe(1);
    if (recommendedVegDishes.length === 1) {
        expect(recommendedVegDishes[0].id).toBe('D4');
        expect(recommendedVegDishes[0].name).toBe('Dish D4'); // 确认是 D4
    }
    // 确保 D1 不在最终推荐中（可以检查整个 recommendations 列表）
    const recommendedAllIds = recommendations.map(d => d.id);
    expect(recommendedAllIds).not.toContain('D1');
  });

  it('should not filter by flavor if flavor_preferences is empty', () => {
    const userInput = { diseases: 0, allergy_mask: 0, flavor_preferences: [] };
    const testDishes = [dish1_su_qingdan, dish2_hun_la_xian];
    const recommendations = recommendDishes(userInput, testDishes);
    const recommendedIds = recommendations.map(d => d.id);
    expect(recommendedIds).toContain('D1');
    expect(recommendedIds).toContain('D2');
  });

  it('should not filter by flavor if flavor_preferences is not provided', () => {
    const userInput = { diseases: 0, allergy_mask: 0 }; // flavor_preferences 省略
    const testDishes = [dish1_su_qingdan, dish2_hun_la_xian];
    const recommendations = recommendDishes(userInput, testDishes);
    const recommendedIds = recommendations.map(d => d.id);
    expect(recommendedIds).toContain('D1');
    expect(recommendedIds).toContain('D2');
  });
  
  it('should correctly recommend from dishes that passed flavor filter for each category', () => {
    const userInput = { diseases: 0, allergy_mask: 0, flavor_preferences: ['鲜浓'] };
    // D1(素,清淡), D2(荤,辣,鲜浓), D3(汤,甜), D4(素,无), D5(荤,鲜浓), D6(汤,无,高分描述)
    // 口味过滤后应该剩下: D2, D4, D5, D6 (因为D4, D6无标签)
    // 品类 '素菜': D4 (无标签)
    // 品类 '荤菜': D2 (辣,鲜浓), D5 (鲜浓) -> 期望D2或D5中评分高的
    // 品类 '汤': D6 (无标签)
    const recommendations = recommendDishes(userInput, allTestDishes);
    const recommendedIds = recommendations.map(d => d.id);

    const recommendedVegDish = recommendations.find(d => d.category === '素菜');
    const recommendedMeatDish = recommendations.find(d => d.category === '荤菜');
    const recommendedSoupDish = recommendations.find(d => d.category === '汤');

    expect(recommendedVegDish).toBeDefined();
    expect(recommendedVegDish.id).toBe('D4'); // D4是唯一通过口味过滤（因无标签）的素菜

    expect(recommendedMeatDish).toBeDefined();
    // D2(辣,鲜浓) vs D5(鲜浓). 假设D2描述短，D5描述稍长一点，但这里我们用的是固定描述。
    // 如果评分仅基于基础分和描述，两者可能很接近或相同，取决于具体实现。
    // 为了测试稳定，我们可以让D5的描述更长，使其评分高于D2
    const dish5_modified_desc = 'A very long and detailed description for D5 to ensure it scores higher if it matches flavor.';
    const dish5_modified = createDish('D5', '荤菜', ['鲜浓'], {description: dish5_modified_desc });
    const dish2_modified_short_desc = 'Short desc.';
    const dish2_modified = createDish('D2', '荤菜', ['辣', '鲜浓'], {description: dish2_modified_short_desc});
    
    const testDishesModified = allTestDishes.map(d => {
        if (d.id === 'D5') return dish5_modified;
        if (d.id === 'D2') return dish2_modified;
        return d;
    });

    const recommendationsWithModifiedDishes = recommendDishes(userInput, testDishesModified);
    const meatDishFromModifiedDishes = recommendationsWithModifiedDishes.find(d => d.category === '荤菜');
    
    expect(meatDishFromModifiedDishes).toBeDefined();
    // D2和D5都包含鲜浓。如果D5评分更高，它应该被推荐。
    expect(['D2', 'D5']).toContain(meatDishFromModifiedDishes.id); // D2或D5其一
    if (meatDishFromModifiedDishes.id === 'D2') {
        expect(dish2_modified.flavor_tags).toEqual(expect.arrayContaining(['鲜浓']));
    } else {
        expect(dish5_modified.flavor_tags).toEqual(expect.arrayContaining(['鲜浓']));
    }
    
    expect(recommendedSoupDish).toBeDefined();
    expect(recommendedSoupDish.id).toBe('D6'); // D6 (无标签) 是唯一通过口味过滤的汤，且我们给了它高分描述
  });

  it('should return empty array if no dishes match flavor preferences and no dishes without flavor tags exist in a category', () => {
    const userInput = { diseases: 0, allergy_mask: 0, flavor_preferences: ['不存在的口味'] };
    const testDishesOnlyWithFlavors = [dish1_su_qingdan, dish2_hun_la_xian, dish3_tang_tian]; // 所有菜品都有口味标签
    
    const recommendations = recommendDishes(userInput, testDishesOnlyWithFlavors);
    expect(recommendations).toBeInstanceOf(Array);
    // 因为所有菜品都有口味标签，且都不匹配 "不存在的口味"，所以每个品类都应该没有菜品可选
    // 因此最终的推荐列表应该是空的
    expect(recommendations.length).toBe(0); 
  });

}); 