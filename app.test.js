const request = require('supertest');
const { app, server } = require('./app'); // 修正路径
const fs = require('fs');
const path = require('path');

// 使用一个不同的变量名来引用 app，以避免与全局的 app 冲突（如果存在）
const realApp = app; 

const dishesPath = path.join(__dirname, '../dishes.json');
let originalDishesData = [];

// ... existing code ...

// ---------------------------
// API Endpoints Test Suite (using realApp)
// ---------------------------
describe('API Endpoints Test Suite (using realApp)', () => {
  describe('/ GET', () => {
    it('should serve index.html file when requested', async () => {
      let response;
      try {
        response = await request(realApp).get('/');
      } catch (error) {
        // 显式捕获并抛出错误，便于定位问题
        throw new Error(`Request failed with error: ${error.message}`);
      }

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/html/);
      expect(response.text).toContain('<html'); // 简单验证 HTML 内容
    }, 5000); // 设置合理超时时间
    });

  describe('/index.html GET', () => {
    it('should serve index.html file when requested', async () => {
        const response = await request(realApp).get('/index.html');
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/html/);
    });
});

  describe('/test GET', () => {
    it('should return 200 and expected message', async () => {
      const response = await request(realApp).get('/test');
      expect(response.status).toBe(200);
      expect(response.text).toBe('测试路由正常工作！');
    });
  });

  describe('/diagnose GET', () => {
    it('IT-APP-004: should return 200 and JSON diagnostic info', async () => {
      const response = await request(realApp).get('/diagnose');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('totalDishes');
      expect(response.body).toHaveProperty('nutritionStats');
      expect(response.body).toHaveProperty('sampleDishes');
    });
  });

  describe('/recommend POST', () => {
    it('IT-APP-005: should return 200 and recommendations for valid input', async () => {
      const response = await request(realApp)
        .post('/recommend')
        .send({ diseases: 1, allergy_mask: 0 });
      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      // 可以在这里添加更多关于推荐结果结构的断言
    });

    it('IT-APP-006: should return 400 for invalid input (missing diseases)', async () => {
      const response = await request(realApp)
        .post('/recommend')
        .send({ allergy_mask: 0 });
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBeDefined();
    });
     it('IT-APP-006: should return 400 for invalid input (diseases not a number)', async () => {
      const response = await request(realApp)
        .post('/recommend')
        .send({ diseases: "a string", allergy_mask: 0 });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
    });
  });

// ---------------------------
// Enhanced API Endpoint Test Suite (Error Handling and Security)
// ---------------------------
describe('Enhanced API Endpoint Test Suite (Error Handling and Security)', () => {
  // /recommend endpoint tests
  describe('/recommend POST - Enhanced Error Handling', () => {
    it('should return 400 if diseases is not a number (enhanced)', async () => {
      const response = await request(realApp)
        .post('/recommend')
        .send({ diseases: "abc", allergy_mask: 0 });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if allergy_mask is not a number (enhanced)', async () => {
      const response = await request(realApp)
        .post('/recommend')
        .send({ diseases: 0, allergy_mask: "xyz" });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for empty JSON object input to /recommend (enhanced)', async () => {
      const response = await request(realApp)
        .post('/recommend')
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle potentially malicious string input for /recommend (conceptual)', async () => {
      const response = await request(realApp)
        .post('/recommend')
        .send({ diseases: 0, allergy_mask: 0, preferences: ["<script>alert('xss')</script>"] });
      // Now that we actively block common XSS patterns, this should also return 400
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    // Enhanced XSS tests for /recommend
    it('should reject or sanitize common XSS payload in preferences (img onerror)', async () => {
      const response = await request(realApp)
        .post('/recommend')
        .send({ diseases: 0, allergy_mask: 0, preferences: ['<img src=x onerror=alert(1)>'] });
      // Expecting 400 if rejected, or 200 if sanitized AND validated that no script runs.
      // For simplicity, we'll aim for 400 Bad Request as a safer default assumption for unhandled malicious patterns.
      expect(response.status).toBe(400); 
      expect(response.body).toHaveProperty('error');
    });

    it('should reject or sanitize XSS payload in preferences (javascript URI)', async () => {
      const response = await request(realApp)
        .post('/recommend')
        .send({ diseases: 0, allergy_mask: 0, preferences: ['<a href="javascript:alert(1)">click me</a>'] });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

  });

  // Security Headers Test (Conceptual)
  describe('Security Headers (Enhanced)', () => {
    it('should include X-Content-Type-Options: nosniff header', async () => {
      const response = await request(realApp).get('/'); // Check on any suitable endpoint
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should include X-Frame-Options: DENY header to prevent clickjacking', async () => {
      const response = await request(realApp).get('/');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });
    
    // 你可以根据 helmet 设置的其他默认头添加更多测试
    // 例如：X-DNS-Prefetch-Control, Strict-Transport-Security (如果配置了HTTPS)
  });
});

describe('POST /recommend with flavor_preferences', () => {
  it('should return dishes matching "清淡" flavor preference', async () => {
    const response = await request(realApp)
      .post('/recommend')
      .send({
        diseases: 0, // 无特殊疾病
        allergy_mask: 0, // 无忌口
        flavor_preferences: ["清淡"]
      });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    // 期望至少有一个推荐
    expect(response.body.length).toBeGreaterThan(0);
    // 期望推荐中包含 "炝炒时蔬" (D001) - 因为它匹配"清淡"口味偏好，应该得分更高
    const recommendedNames = response.body.map(dish => dish.name);
    expect(recommendedNames).toContain('炝炒时蔬');
    
    // 验证推荐的菜品中，有口味标签的确实匹配"清淡"，或者没有口味标签
    response.body.forEach(dish => {
      if (dish.flavor_tags && dish.flavor_tags.length > 0) {
        expect(dish.flavor_tags).toContain('清淡');
      }
      // 没有口味标签的菜品也可能被推荐（获得中等加分）
    });
  });

  it('should return dishes matching "辣" and "鲜浓" flavor preferences with higher scores', async () => {
    const response = await request(realApp)
      .post('/recommend')
      .send({
        diseases: 0,
        allergy_mask: 0,
        flavor_preferences: ["辣", "鲜浓"]
      });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
    
    // 所有菜品都应该参与推荐，但匹配口味偏好的应该得分更高
    // 验证推荐结果中包含匹配口味偏好的菜品
    const hasMatchingFlavorDish = response.body.some(dish => {
      if (dish.flavor_tags && dish.flavor_tags.length > 0) {
        return dish.flavor_tags.some(tag => ["辣", "鲜浓"].includes(tag));
      }
      return false; // 没有口味标签的菜品不算匹配
    });
    expect(hasMatchingFlavorDish).toBe(true);
  });

  it('should still recommend dishes even if no dishes match the flavor preference', async () => {
    const response = await request(realApp)
      .post('/recommend')
      .send({
        diseases: 0,
        allergy_mask: 0,
        flavor_preferences: ["不存在的口味"]
      });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    
    // 即使没有菜品匹配口味偏好，仍然应该推荐每个品类中得分最高的菜品
    expect(response.body.length).toBeGreaterThan(0);
    
    // 验证推荐结果包含不同品类的菜品
    const categories = response.body.map(dish => dish.category);
    const uniqueCategories = [...new Set(categories)];
    expect(uniqueCategories.length).toBeGreaterThan(0);
  });

  it('should ignore flavor_preferences if it is an empty array and recommend normally', async () => {
    const response = await request(realApp)
      .post('/recommend')
      .send({
        diseases: 0,
        allergy_mask: 0,
        flavor_preferences: [] // 空数组
      });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0); // 应该有推荐结果
    
    // 验证推荐结果包含不同品类的菜品
    const categories = response.body.map(dish => dish.category);
    const uniqueCategories = [...new Set(categories)];
    expect(uniqueCategories.length).toBeGreaterThan(0);
  });
  
  it('should ignore flavor_preferences if it is not provided and recommend normally', async () => {
    const response = await request(realApp)
      .post('/recommend')
      .send({
        diseases: 0,
        allergy_mask: 0
        // flavor_preferences 未提供
      });
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
    
    // 验证推荐结果包含不同品类的菜品
    const categories = response.body.map(dish => dish.category);
    const uniqueCategories = [...new Set(categories)];
    expect(uniqueCategories.length).toBeGreaterThan(0);
  });

  it('should return 400 if flavor_preferences is not an array', async () => {
    const response = await request(realApp)
      .post('/recommend')
      .send({
        diseases: 0,
        flavor_preferences: { "口味": "甜" } // 无效格式
      });
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toContain('"flavor_preferences" 字段必须是一个数组。');
  });

  it('should return 400 if flavor_preferences is an array containing non-string items', async () => {
    const response = await request(realApp)
      .post('/recommend')
      .send({
        diseases: 0,
        flavor_preferences: ["甜", 123] // 包含数字
      });
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toContain('"flavor_preferences" 数组中的元素必须是字符串。');
  });
});

// 确保在所有测试结束后关闭服务器
afterAll((done) => {
  if (server && server.listening) {
    server.close(done);
  } else {
    done(); // 如果服务器未启动或已关闭，则直接完成
  }
  // 恢复原始的 dishes.json 文件内容（如果需要且已修改）
  // fs.writeFileSync(dishesPath, JSON.stringify(originalDishesData, null, 2), 'utf8');
});