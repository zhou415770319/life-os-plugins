/**
 * 儿童定时播放（dsh-plugin-child-tv）— 平台内置集成插件
 *
 * 本插件为 Life-OS 平台内置实现：前端页面与后端逻辑已深度集成在主工程代码中
 * （client/src 页面组件 + server/modules 业务模块），并非独立分发的 plugin.js 运行时。
 *
 * 本文件仅为满足插件市场统一结构而生成的入口占位文件，安装/卸载由插件中心
 * 的「启用 / 暂停 / 卸载」生命周期统一管理。
 *
 * 版本：1.2.0
 * 入口页面：/child-tv-admin
 */
'use strict';

module.exports = {
  key: 'dsh-plugin-child-tv',
  name: '儿童定时播放',
  version: '1.2.0',
  builtin: true,
  routePath: '/child-tv-admin',
};
