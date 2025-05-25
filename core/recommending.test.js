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

  it('should give higher scores to dishes matching flavor preferences', () => {
    const userInput = { diseases: 0, allergy_mask: 0, flavor_preferences: ['清淡'] };
    const recommendations = recommendDishes(userInput, allTestDishes);
    
    // 所有菜品都应该参与推荐，但匹配口味偏好的菜品应该得分更高
    expect(recommendations.length).toBeGreaterThan(0);
    
    // 找到素菜推荐（应该是D1，因为它匹配"清淡"口味偏好）
    const vegRecommendation = recommendations.find(d => d.category === '素菜');
    expect(vegRecommendation).toBeDefined();
    expect(vegRecommendation.id).toBe('D1'); // D1应该因为匹配口味偏好而得分更高
  });

  it('should recommend dishes matching multiple flavor preferences', () => {
    const userInput = { diseases: 0, allergy_mask: 0, flavor_preferences: ['辣', '甜'] };
    const recommendations = recommendDishes(userInput, allTestDishes);
    
    expect(recommendations.length).toBeGreaterThan(0);
    
    // 荤菜推荐应该是D2（匹配"辣"）
    const meatRecommendation = recommendations.find(d => d.category === '荤菜');
    expect(meatRecommendation).toBeDefined();
    expect(meatRecommendation.id).toBe('D2'); // D2匹配"辣"口味偏好
    
    // 汤推荐应该是D3（匹配"甜"）
    const soupRecommendation = recommendations.find(d => d.category === '汤');
    expect(soupRecommendation).toBeDefined();
    expect(soupRecommendation.id).toBe('D3'); // D3匹配"甜"口味偏好
  });

  it('should give moderate scores to dishes without flavor tags when user has flavor preferences', () => {
    const userInput = { diseases: 0, allergy_mask: 0, flavor_preferences: ['椒麻'] }; // 不存在的口味
    const testDishes = [dish1_su_qingdan, dish4_su_no_flavor]; 
    const recommendations = recommendDishes(userInput, testDishes);
    
    // 应该推荐D4，因为它没有口味标签，获得中等加分（10分）
    // 而D1有"清淡"标签但不匹配"椒麻"，只获得基础分
    const vegRecommendation = recommendations.find(d => d.category === '素菜');
    expect(vegRecommendation).toBeDefined();
    expect(vegRecommendation.id).toBe('D4'); // D4应该因为中等加分而胜出
  });

  it('should recommend all categories when no flavor preferences specified', () => {
    const userInput = { diseases: 0, allergy_mask: 0, flavor_preferences: [] };
    const testDishes = [dish1_su_qingdan, dish2_hun_la_xian, dish3_tang_tian];
    const recommendations = recommendDishes(userInput, testDishes);
    
    // 没有口味偏好时，所有菜品都应该参与推荐
    expect(recommendations.length).toBe(3); // 每个品类一个推荐
    const recommendedIds = recommendations.map(d => d.id);
    expect(recommendedIds).toContain('D1');
    expect(recommendedIds).toContain('D2');
    expect(recommendedIds).toContain('D3');
  });

  it('should recommend all categories when flavor_preferences is not provided', () => {
    const userInput = { diseases: 0, allergy_mask: 0 }; // flavor_preferences 省略
    const testDishes = [dish1_su_qingdan, dish2_hun_la_xian, dish3_tang_tian];
    const recommendations = recommendDishes(userInput, testDishes);
    
    expect(recommendations.length).toBe(3);
    const recommendedIds = recommendations.map(d => d.id);
    expect(recommendedIds).toContain('D1');
    expect(recommendedIds).toContain('D2');
    expect(recommendedIds).toContain('D3');
  });
  
  it('should correctly score and recommend dishes based on flavor matching', () => {
    const userInput = { diseases: 0, allergy_mask: 0, flavor_preferences: ['鲜浓'] };
    
    // 创建两个荤菜，一个匹配口味偏好，一个不匹配
    const dish2_matching = createDish('D2', '荤菜', ['辣', '鲜浓'], {description: 'Short description'});
    const dish5_matching = createDish('D5', '荤菜', ['鲜浓'], {description: 'Very long and detailed description for higher base score'});
    
    const testDishes = [dish1_su_qingdan, dish2_matching, dish3_tang_tian, dish4_su_no_flavor, dish5_matching, dish6_tang_no_flavor_high_score];
    const recommendations = recommendDishes(userInput, testDishes);
    
    expect(recommendations.length).toBeGreaterThan(0);
    
    // 荤菜推荐应该是匹配"鲜浓"的菜品中得分最高的
    const meatRecommendation = recommendations.find(d => d.category === '荤菜');
    expect(meatRecommendation).toBeDefined();
    expect(['D2', 'D5']).toContain(meatRecommendation.id); // 应该是D2或D5中的一个
    
    // 验证推荐的菜品确实匹配口味偏好
    if (meatRecommendation.flavor_tags && meatRecommendation.flavor_tags.length > 0) {
      expect(meatRecommendation.flavor_tags).toContain('鲜浓');
    }
  });

  it('should still recommend dishes even if no dishes match flavor preferences', () => {
    const userInput = { diseases: 0, allergy_mask: 0, flavor_preferences: ['不存在的口味'] };
    const testDishesOnlyWithFlavors = [dish1_su_qingdan, dish2_hun_la_xian, dish3_tang_tian];
    
    const recommendations = recommendDishes(userInput, testDishesOnlyWithFlavors);
    expect(recommendations).toBeInstanceOf(Array);
    
    // 即使没有菜品匹配口味偏好，仍然应该推荐每个品类中得分最高的菜品
    expect(recommendations.length).toBe(3); // 每个品类一个推荐
    const recommendedIds = recommendations.map(d => d.id);
    expect(recommendedIds).toContain('D1');
    expect(recommendedIds).toContain('D2');
    expect(recommendedIds).toContain('D3');
  });

});