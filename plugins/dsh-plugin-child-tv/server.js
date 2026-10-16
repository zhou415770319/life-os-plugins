/**
 * 儿童定时播放（dsh-plugin-child-tv）— 插件云函数 server.js
 *
 * 提供基于后端能力的「系统文件/文件夹选择」：
 * 在服务运行所在电脑上弹出系统原生对话框（OpenFileDialog / FolderBrowserDialog），
 * 返回所选路径。前端通过 POST /api/plugins/methods/dsh-plugin-child-tv.<method>/execute 调用。
 *
 * 说明：
 * - 仅支持 Windows（服务运行电脑需为 Windows 且有桌面会话，对话框才会显示）；
 * - 对话框会阻塞后端进程直至用户选择完成或取消（单机管理操作，可接受）。
 */
'use strict';

const { spawnSync } = require('child_process');

const CANCEL_MARK = '__CT_CANCELED__';

const VIDEO_EXTS = new Set([
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts', '.mpg', '.mpeg', '.rmvb', '.rm',
]);
const AUDIO_EXTS = new Set([
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma', '.ape', '.opus',
]);

/** 列出目录内容（前端文件选择器数据源，返回盘符/子目录/文件） */
function listDir(rawPath) {
  const fs = require('fs');
  const path = require('path');
  let p = rawPath ? String(rawPath).trim() : '';

  // 去掉尾部分隔符（保留盘符根）
  if (p && p.length > 1 && (p.endsWith('\\') || p.endsWith('/'))) {
    p = p.slice(0, -1);
  }

  if (!p) {
    // 返回所有存在的盘符
    const drives = [];
    for (let c = 65; c <= 90; c += 1) {
      const letter = `${String.fromCharCode(c)}:`;
      try {
        if (fs.existsSync(letter)) drives.push(letter);
      } catch {
        /* ignore */
      }
    }
    return { success: true, path: null, parent: null, drives, dirs: [], files: [] };
  }

  // 补全盘符根：C: -> C:\
  if (/^[A-Za-z]:$/.test(p)) p = `${p}\\`;

  let stat;
  try {
    stat = fs.statSync(p);
  } catch (e) {
    return { success: false, error: `无法访问路径：${e.message}` };
  }
  if (!stat.isDirectory()) {
    return { success: false, error: `不是文件夹：${p}` };
  }

  let entries;
  try {
    entries = fs.readdirSync(p, { withFileTypes: true });
  } catch (e) {
    return { success: false, error: `读取目录失败：${e.message}` };
  }

  const dirs = [];
  const files = [];
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    if (ent.isDirectory()) {
      dirs.push(ent.name);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      const kind = VIDEO_EXTS.has(ext) ? 'video' : AUDIO_EXTS.has(ext) ? 'audio' : 'other';
      files.push({ name: ent.name, path: path.join(p, ent.name), kind });
    }
  }
  dirs.sort((a, b) => a.localeCompare(b, 'zh'));
  files.sort((a, b) => a.name.localeCompare(b.name, 'zh'));

  const parentPath = path.dirname(p);
  return {
    success: true,
    path: p,
    parent: parentPath === p ? null : parentPath,
    drives: [],
    dirs,
    files,
  };
}

/** 弹出系统对话框（file=OpenFileDialog，directory=FolderBrowserDialog） */
function pickWithDialog(kind, opts) {
  if (process.platform !== 'win32') {
    return {
      success: false,
      error: '系统文件选择仅支持 Windows（需要服务运行电脑为 Windows 并弹出对话框）',
    };
  }

  const script =
    kind === 'file'
      ? `
Add-Type -AssemblyName System.Windows.Forms
try {
  $dlg = New-Object System.Windows.Forms.OpenFileDialog
  $dlg.Title = $env:CT_PICK_TITLE
  $dlg.Filter = $env:CT_PICK_FILTER
  $dlg.Multiselect = $false
  if ($env:CT_PICK_INIT) { try { $dlg.InitialDirectory = $env:CT_PICK_INIT } catch {} }
  $r = $dlg.ShowDialog()
  if ($r -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Write($dlg.FileName) } else { [Console]::Write('${CANCEL_MARK}') }
} catch { [Console]::Write('__CT_ERR__' + $_.Exception.Message) }
`
      : `
Add-Type -AssemblyName System.Windows.Forms
try {
  $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
  $dlg.Description = $env:CT_PICK_TITLE
  if ($env:CT_PICK_INIT) { try { $dlg.SelectedPath = $env:CT_PICK_INIT } catch {} }
  $r = $dlg.ShowDialog()
  if ($r -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Write($dlg.SelectedPath) } else { [Console]::Write('${CANCEL_MARK}') }
} catch { [Console]::Write('__CT_ERR__' + $_.Exception.Message) }
`;

  const res = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8',
    timeout: 120000,
    env: {
      ...process.env,
      CT_PICK_TITLE: opts.title || (kind === 'file' ? '选择文件' : '选择文件夹'),
      CT_PICK_FILTER: opts.filter || '所有文件 (*.*)|*.*',
      CT_PICK_INIT: opts.initialPath || '',
    },
  });

  if (res.error) {
    return { success: false, error: `无法启动系统对话框：${res.error.message}` };
  }
  if (res.status !== 0) {
    return {
      success: false,
      error: `对话框执行失败：${(res.stderr || res.stdout || '').trim() || `退出码 ${res.status}`}`,
    };
  }

  const out = (res.stdout || '').trim();
  if (out.startsWith('__CT_ERR__')) {
    return { success: false, error: out.slice('__CT_ERR__'.length) || '系统对话框执行失败' };
  }
  if (!out || out === CANCEL_MARK) {
    return { success: true, path: null, canceled: true };
  }
  return { success: true, path: out, canceled: false };
}

module.exports = {
  methods: [
    {
      name: 'listDir',
      description:
        '列出指定目录下的子目录与文件（前端文件/文件夹选择器的数据源）；不传 path 时返回所有盘符列表',
      params: [
        { name: 'path', type: 'string', required: false, description: '目录路径，留空返回盘符列表' },
      ],
      dangerous: false,
      handler: (args) => listDir(args.path),
    },
    {
      name: 'pickFilePath',
      description:
        '弹出系统「选择文件」对话框（在服务运行电脑上显示），返回所选文件的完整路径；用户取消时返回 canceled=true',
      params: [
        { name: 'title', type: 'string', required: false, description: '对话框标题' },
        {
          name: 'filter',
          type: 'string',
          required: false,
          description: '文件过滤规则，如 可执行文件 (*.exe)|*.exe|所有文件 (*.*)|*.*',
        },
        { name: 'initialPath', type: 'string', required: false, description: '初始定位目录' },
      ],
      dangerous: false,
      handler: (args) =>
        pickWithDialog('file', {
          title: args.title,
          filter: args.filter,
          initialPath: args.initialPath,
        }),
    },
    {
      name: 'pickDirectoryPath',
      description:
        '弹出系统「选择文件夹」对话框（在服务运行电脑上显示），返回所选文件夹的完整路径；用户取消时返回 canceled=true',
      params: [
        { name: 'title', type: 'string', required: false, description: '对话框标题' },
        { name: 'initialPath', type: 'string', required: false, description: '初始定位目录' },
      ],
      dangerous: false,
      handler: (args) =>
        pickWithDialog('directory', {
          title: args.title,
          initialPath: args.initialPath,
        }),
    },
  ],
};
