module.exports = {
  // 单行最大字符数
  // printWidth: 80, // 默认值，可根据团队习惯调整，例如调整到 100 或 120
  printWidth: 100, // 例如，设置为 100 字符

  // 每个 tab 的空格数
  tabWidth: 2, // 默认值，通常保持 2 个空格

  // 使用 tab 还是空格缩进
  useTabs: false, // 默认值，使用空格缩进

  // 语句的末尾是否添加分号
  semi: true, // 默认值，添加分号。也可设置为 false，不添加分号（根据团队习惯选择）

  // 使用单引号还是双引号
  singleQuote: false, // 默认值，使用双引号。可设置为 true 使用单引号（根据团队习惯选择）
  // 例如，设置为 true 使用单引号
  // singleQuote: true,

  // 对象或数组是否使用拖尾逗号（trailing comma）
  // "none": 不使用拖尾逗号
  // "es5": 在 ES5 中有效的场景使用（对象、数组等）
  // "all": 在所有可能的地方使用（包括函数参数列表等）
  trailingComma: 'es5', // 默认值是 "es5"，推荐保持或根据项目目标 ES 版本选择 "all"

  // 对象字面量中是否在括号和内容之间添加空格
  // true: { foo: bar }
  // false: {foo: bar}
  bracketSpacing: true, // 默认值，推荐保持

  // JSX 元素中，多行属性的 > 是否放在最后一行的末尾，而不是单独一行
  // true: <button
  //         className="prettier-class"
  //         id="prettier-id"
  //       >
  //         Click Here
  //       </button>
  // false: <button
  //         className="prettier-class"
  //         id="prettier-id"
  //       >
  //         Click Here
  //       </button>
  jsxBracketSameLine: false, // 默认值，推荐保持

  // 箭头函数参数只有一个时，是否总是添加括号
  // "always": 总是添加 (x) => x
  // "avoid": 尽可能不添加 x => x
  arrowParens: 'avoid', // 默认值是 "avoid"，也可设置为 "always" 保持一致性（根据团队习惯选择）
  // 例如，设置为 "always"
  // arrowParens: 'always',

  // HTML 的空白符敏感度
  // "css": 遵循 CSS display 属性的默认值
  // "strict": 空白符被认为是重要的
  // "ignore": 空白符被认为是无关紧要的
  htmlWhitespaceSensitivity: 'css', // 默认值，推荐保持

  // Vue 文件中 <script> 和 <style> 标签的内容是否缩进
  vueIndentScriptAndStyle: false, // 默认值，不缩进。可设置为 true 进行缩进

  // 是否在文件顶部插入一个特殊的 @prettier 和 @format 标记，以表明文件已经被 Prettier 格式化过
  // insertPragma: false, // 默认值，不插入
  // requirePragma: false, // 默认值，不要求文件顶部有标记才格式化

  // markdown 文本中的换行方式
  // "always": 超过 printWidth 总是换行
  // "never": 不换行
  // "preserve": 保持原样
  proseWrap: 'preserve', // 默认值，推荐保持 "preserve" 或设置为 "always"

  // 控制对象属性的引用方式
  // "as-needed": 仅在需要时引用
  // "consistent": 如果有属性需要引用，则所有属性都引用
  // "preserve": 保持用户输入的引用方式
  quoteProps: 'as-needed', // 默认值，推荐保持

  // 对引用代码块进行格式化
  // embeddedLanguageFormatting: 'auto', // 默认值，自动检测并格式化

  // 在同一行中格式化多个 class 属性时，是否对 class 进行排序
  // sortClasses: false, // 默认值，需要配合插件使用

  // 自定义 parser，通常不需要手动设置，Prettier 会自动推断
  // parser: 'babel',

  // 指定要处理的文件路径，通常在 CLI 或编辑器插件中配置，而不是在配置文件中
  // filepath: 'none',

  // 对指定文件应用特定的配置，非常有用
  // overrides: [
  //   {
  //     files: '*.md', // 对 markdown 文件应用以下配置
  //     options: {
  //       proseWrap: 'always', // markdown 文件总是换行
  //     },
  //   },
  //   {
  //     files: '*.html', // 对 html 文件应用以下配置
  //     options: {
  //       htmlWhitespaceSensitivity: 'ignore', // html 空白符不敏感
  //     },
  //   },
  // ],
}; 