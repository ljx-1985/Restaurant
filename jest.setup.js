/**
 * @file Jest 测试环境设置
 * @description 在测试运行前设置环境变量，防止服务器在测试时启动
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';

// 设置测试超时时间
jest.setTimeout(10000);

// 在所有测试开始前运行
beforeAll(() => {
  console.log('🧪 Jest 测试环境已设置');
});

// 在所有测试结束后运行
afterAll(() => {
  console.log('✅ Jest 测试完成');
}); 