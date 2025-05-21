/**
 * @file ESLint 配置
 * @description 此配置适用于 Node.js Express 项目，并与 Prettier 集成。
 */
module.exports = {
  /**
   * 定义代码的运行环境。
   * @property {boolean} commonjs - 启用 CommonJS 全局变量和 CommonJS 作用域 (用于 Browserify/WebPack 打包的 CommonJS 代码)。对于 Node.js 项目，通常设置为 true。
   * @property {boolean} es2021 - 启用 ES2021 全局变量并自动将 parserOptions.ecmaVersion 设置为 12。
   * @property {boolean} node - 启用 Node.js 全局变量和 Node.js 作用域。
   */
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  /**
   * 扩展一组基础配置。
   * - 'eslint:recommended': ESLint 官方推荐的基础规则集。
   * - 'plugin:node/recommended': eslint-plugin-node 插件的推荐规则集，适用于 Node.js 项目。
   * - 'prettier': 用于禁用 ESLint 中与 Prettier 冲突的格式化规则。确保这是数组中的最后一个元素。
   */
  extends: ['eslint:recommended', 'plugin:node/recommended', 'prettier'],
  /**
   * 解析器选项。
   * @property {string|number} ecmaVersion - 指定您要使用的 ECMAScript 语法版本。'latest' 将使用最新的受支持版本。
   * @property {string} sourceType - 设置为 "script" (默认) 或 "module"（如果你的代码是 ECMAScript 模块）。对于传统的 Node.js Express 项目，通常是 'script'。
   */
  parserOptions: {
    ecmaVersion: 'latest',
    // sourceType: 'module', // 如果使用 ES Modules (import/export), 请取消此行注释
  },
  /**
   * 自定义规则。
   * 规则的值可以是：
   * - "off" 或 0: 关闭规则
   * - "warn" 或 1: 将规则视为一个警告 (不会影响退出码)
   * - "error" 或 2: 将规则视为一个错误 (退出码为1)
   * 可以在这里覆盖 extends 中的规则，或添加新的规则。
   */
  rules: {
    /**
     * 在生产环境中禁止使用 console，在开发环境中允许。
     * @type {string|Array<string|object>}
     */
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    /**
     * 强制执行一致的缩进。
     * 注意：此规则通常由 Prettier 处理，如果 Prettier 配置了不同的缩进，此规则可能会冲突。
     * 如果完全依赖 Prettier 进行格式化，可以省略此规则或设置为 "off"。
     * @type {Array<string|number>}
     */
    // indent: ['error', 2], // Prettier 会处理缩进

    /**
     * 要求或禁止使用分号代替 ASI。
     * 注意：此规则也通常由 Prettier 处理。
     * @type {Array<string|string>}
     */
    // semi: ['error', 'always'], // Prettier 会处理分号

    /**
     * 强制使用一致的反勾号、双引号或单引号。
     * 注意：此规则也通常由 Prettier 处理。
     * @type {Array<string|string|object>}
     */
    // quotes: ['error', 'single'], // Prettier 会处理引号

    // Node.js 特定规则示例 (可以根据项目需求和 Node 版本调整)
    /**
     * 禁止使用当前 Node.js 版本不支持的 ECMAScript 语法。
     * @type {Array<string|object>}
     */
    // 'node/no-unsupported-features/es-syntax': ['error', { version: '>=14.0.0' }], // 根据你的 Node.js 版本调整
    /**
     * 禁止使用当前 Node.js 版本不支持的内建模块。
     * @type {Array<string|object>}
     */
    // 'node/no-unsupported-features/node-builtins': ['error', { version: '>=14.0.0' }], // 根据你的 Node.js 版本调整

    /**
     * 建议在回调函数中处理错误。
     * @type {string}
     */
    'handle-callback-err': 'warn',

    /**
     * 禁止在 require() 之后立即调用 new 操作符。
     * @type {string}
     */
    'no-new-require': 'error',

    /**
     * 禁止对 __dirname 和 __filename 进行字符串连接。
     * @type {string}
     */
    'no-path-concat': 'error',

    /**
     * 在 Node.js 中，优先使用全局的 Buffer 而不是 require('buffer').Buffer。
     * @type {string}
     */
    'node/prefer-global/buffer': ['error', 'always'],
    /**
     * 在 Node.js 中，优先使用全局的 console 而不是 require('console')。
     * @type {string}
     */
    'node/prefer-global/console': ['error', 'always'],
    /**
     * 在 Node.js 中，优先使用全局的 process 而不是 require('process')。
     * @type {string}
     */
    'node/prefer-global/process': ['error', 'always'],
    /**
     * 在 Node.js 中，优先使用全局的 TextDecoder 而不是 require('util').TextDecoder。
     * @type {string}
     */
    'node/prefer-global/text-decoder': ['error', 'always'],
    /**
     * 在 Node.js 中，优先使用全局的 TextEncoder 而不是 require('util').TextEncoder。
     * @type {string}
     */
    'node/prefer-global/text-encoder': ['error', 'always'],
    /**
     * 在 Node.js 中，优先使用全局的 URLSearchParams 而不是 require('url').URLSearchParams。
     * @type {string}
     */
    'node/prefer-global/url-search-params': ['error', 'always'],
    /**
     * 在 Node.js 中，优先使用全局的 URL 而不是 require('url').URL。
     * @type {string}
     */
    'node/prefer-global/url': ['error', 'always'],
    /**
     * 优先使用 Promises API 的 Node.js 核心模块。
     * 例如，使用 fs.promises.readFile() 而不是 fs.readFile()。
     * @type {string}
     */
    'node/prefer-promises/fs': 'warn', // 对于文件系统操作，建议使用 Promise 版本
    'node/prefer-promises/dns': 'warn', // 对于 DNS 操作，建议使用 Promise 版本
  },
  /**
   * 插件列表。
   * 'eslint-plugin-node' 插件已通过 'extends' 中的 'plugin:node/recommended' 引入并配置。
   * 如果需要，可以在这里添加其他插件。
   */
  // plugins: [], // 例如: ['react', 'jest']
}; 