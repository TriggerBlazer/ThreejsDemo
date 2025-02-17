// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
export default [
    {
        files: ["src/**/*.js", "src/**/*.jsx"], // 匹配文件类型
        languageOptions: {
            ecmaVersion: "latest", // ES 版本
            sourceType: "module", // 模块化语法
            globals: {
                // 全局变量（如浏览器环境）
                ...globals.browser,
                ...globals.node,
            },
        },
        ignores: ['node_modules/**', 'dist/**', 'build/**', '**/*.min.js',"**/*.module.js"],
        rules: {
            // 自定义规则
            "semi": "error",
            "no-unused-vars": "warn",
            "prefer-const": "error",
            "no-undef": "error",
            "eqeqeq": "error",
        },
    },
];