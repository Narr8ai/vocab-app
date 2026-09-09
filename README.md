# 📱 故事语境速背 App

高考词汇 3500 词 · 26 Lists · 故事语境速背

这是一个面向高考词汇学习的静态 Web App。阶段一已提供本设备上的学习计划、词义主动回忆和拼写回忆、D+1/D+2/D+4/D+7 复习任务，以及基于同一份学习证据的学生、家长和老师报告。账户、跨设备同步、班级管理和会员支付属于后续阶段。

## 文件说明

- **index.html** — App 页面入口
- **src/** — 词表、学习记录、复习调度和报告的类型化模块
- **flowchart.html** — 产品流程图
- **.github/workflows/deploy.yml** — 从 `main` 自动部署到 GitHub Pages 的工作流

## 访问方式

GitHub Pages 部署后可通过以下地址访问：

- App 原型：`https://narr8ai.github.io/vocab-app/`
- 流程图：`https://narr8ai.github.io/vocab-app/flowchart.html`

## 当前原型范围

- 26 个词表及稳定单词 ID
- 本设备持久化学习计划、词义与拼写回忆记录，并可恢复损坏数据
- D+1/D+2/D+4/D+7 复习调度
- 学生、家长和教师共用学习证据的报告视图，可按词表筛选并显示按时复习情况

后续版本将增加账户、跨设备同步、教师班级管理、家庭周报和会员能力。
