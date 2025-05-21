/**
 * @file API 测试脚本
 * @description 用于测试 /recommend API 端点的 Node.js 脚本。
 */

const http = require('http');

// 模拟用户输入数据 (移除了 allergy_mask)
const userInput = {
  diseases: 1, // 示例：糖尿病
  allergy_mask: 0 // 默认无忌口
};

// 另一个测试用例 (移除了 allergy_mask)
const userInput2 = {
  diseases: 4, // 示例：痛风
  allergy_mask: 1 // 示例：忌辛辣
};

// 第三个测试用例 (移除了 allergy_mask)
const userInput3 = {
    diseases: 0, // 示例：无特定疾病
    allergy_mask: 2 // 示例：忌麻辣
};

// 第四个测试用例：测试多种忌口
const userInput4 = {
    diseases: 0, 
    allergy_mask: 3 // 示例：忌辛辣和麻辣 (1 | 2)
};

// 第五个测试用例：测试排除已推荐的菜品
const userInput5 = {
    diseases: 0,
    allergy_mask: 0,
    excludeIds: ["D001", "D002", "D003"] // 排除ID为D001、D002和D003的菜品
};

const jsonDataPayload = JSON.stringify(userInput5); // 选择一个测试用例

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/recommend',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(jsonDataPayload),
  },
};

console.log(`正在向 http://${options.hostname}:${options.port}${options.path} 发送 POST 请求...`);
console.log('请求体:', jsonDataPayload);

const req = http.request(options, (res) => {
  console.log(`\n响应状态码: ${res.statusCode}`);
  // console.log('响应头:', res.headers);

  let responseBody = '';
  res.setEncoding('utf8');

  res.on('data', (chunk) => {
    responseBody += chunk;
  });

  res.on('end', () => {
    try {
      const parsedBody = JSON.parse(responseBody);
      console.log('\nAPI 响应 (JSON):');
      console.log(JSON.stringify(parsedBody, null, 2)); // 美化输出

      if (Array.isArray(parsedBody)) {
        console.log(`\n推荐得到 ${parsedBody.length} 条菜品。`);
        // 可以进一步检查返回的菜品是否符合预期
      }

    } catch (e) {
      console.error('\n解析 API 响应失败:', e.message);
      console.log('原始响应体:', responseBody);
    }
  });
});

req.on('error', (e) => {
  console.error(`请求遇到问题: ${e.message}`);
  if (e.code === 'ECONNREFUSED') {
    console.error(`连接被拒绝。请确保 Express 服务器 (node app.js) 正在运行在 http://${options.hostname}:${options.port}`);
  }
});

// 将数据写入请求体
req.write(jsonDataPayload);
req.end();

async function postData(url = '', data = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

// 更新 postData 调用，移除 allergy_mask
postData(`http://localhost:${options.port}/recommend`, { diseases: 1, allergy_mask: 0 })
  .then(data => {
    console.log('成功 (fetch):', data);
  })
  .catch((error) => {
    console.error('错误 (fetch):', error);
  }); 