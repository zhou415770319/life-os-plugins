(function () {
  'use strict';
  var PLUGIN_KEY = 'reading-notes';
  var COLLECTION = 'notes';
  var state = { items: [], editingId: null };
  var container = null;
  var apiPrefix = '';

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function stars(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
    return s;
  }

  function dataUrl() {
    return apiPrefix + '/api/market/data/' + PLUGIN_KEY + '/' + COLLECTION;
  }

  async function load() {
    var res = await fetch(dataUrl());
    var json = await res.json();
    state.items = json.items || [];
    render();
  }

  async function save(payload) {
    var res = await fetch(dataUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      alert('操作失败：' + (err.message || res.status));
      throw new Error('save failed');
    }
  }

  function submitForm(ev) {
    ev.preventDefault();
    var f = ev.target;
    var title = f.title.value.trim();
    if (!title) { alert('请填写书名/标题'); return; }
    var payload = {
      op: state.editingId ? 'update' : 'add',
      data: {
        id: state.editingId || undefined,
        title: title,
        author: f.author.value.trim() || undefined,
        rating: f.rating.value ? Number(f.rating.value) : undefined,
        content: f.content.value.trim() || undefined,
      },
    };
    save(payload)
      .then(function () {
        state.editingId = null;
        f.reset();
        return load();
      })
      .catch(function () {});
  }

  function startEdit(id) {
    var item = state.items.find(function (x) { return x.id === id; });
    if (!item) return;
    state.editingId = id;
    render();
    var f = container.querySelector('#rn-form');
    if (f) {
      f.title.value = item.title || '';
      f.author.value = item.author || '';
      f.rating.value = item.rating || '';
      f.content.value = item.content || '';
    }
  }

  function removeItem(id) {
    if (!confirm('确定删除这条笔记？')) return;
    save({ op: 'delete', data: { id: id } }).then(load).catch(function () {});
  }

  function render() {
    if (!container) return;
    var list = state.items.map(function (x) {
      var starsHtml = x.rating ? '<span class="rn-stars">' + stars(x.rating) + '</span>' : '';
      return (
        '<div class="rn-item">' +
          '<div class="rn-item-head">' +
            '<div class="rn-item-title">' + esc(x.title) + '</div>' +
            (x.author ? '<div class="rn-item-author">' + esc(x.author) + '</div>' : '') +
            starsHtml +
          '</div>' +
          (x.content ? '<div class="rn-item-content">' + esc(x.content) + '</div>' : '') +
          '<div class="rn-item-actions">' +
            '<button class="rn-btn rn-btn-sm" data-act="edit" data-id="' + x.id + '">编辑</button>' +
            '<button class="rn-btn rn-btn-sm rn-btn-danger" data-act="del" data-id="' + x.id + '">删除</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    container.innerHTML =
      '<div class="rn-wrap">' +
        '<style>' +
          '.rn-wrap{font-family:system-ui,sans-serif;color:#e4e4e7;max-width:720px;margin:0 auto;padding:8px 4px;}' +
          '.rn-head{font-size:18px;font-weight:600;margin-bottom:2px;}' +
          '.rn-sub{font-size:12px;color:#a1a1aa;margin-bottom:16px;}' +
          '.rn-card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:16px;margin-bottom:16px;}' +
          '.rn-form{display:grid;gap:10px;}' +
          '.rn-input,.rn-textarea{width:100%;box-sizing:border-box;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:8px 10px;color:#e4e4e7;font-size:13px;outline:none;}' +
          '.rn-input:focus,.rn-textarea:focus{border-color:#818cf8;}' +
          '.rn-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
          '.rn-btn{background:#6366f1;border:none;color:#fff;border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer;}' +
          '.rn-btn:hover{background:#4f46e5;}' +
          '.rn-btn-sm{padding:4px 10px;font-size:12px;background:rgba(255,255,255,0.08);color:#d4d4d8;}' +
          '.rn-btn-sm:hover{background:rgba(255,255,255,0.14);}' +
          '.rn-btn-danger{color:#f87171;}' +
          '.rn-btn-danger:hover{background:rgba(248,113,113,0.15);}' +
          '.rn-item{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;margin-bottom:10px;}' +
          '.rn-item-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}' +
          '.rn-item-title{font-size:14px;font-weight:500;}' +
          '.rn-item-author{font-size:12px;color:#a1a1aa;}' +
          '.rn-stars{font-size:12px;color:#fbbf24;}' +
          '.rn-item-content{font-size:13px;color:#d4d4d8;margin-top:8px;white-space:pre-wrap;}' +
          '.rn-item-actions{margin-top:10px;display:flex;gap:8px;}' +
          '.rn-empty{text-align:center;color:#71717a;font-size:13px;padding:24px 0;}' +
        '</style>' +
        '<div class="rn-head">📚 读书笔记</div>' +
        '<div class="rn-sub">记录阅读心得，也可在 AI 聊天中直接说「在读书笔记中添加…」</div>' +
        '<div class="rn-card">' +
          '<form class="rn-form" id="rn-form">' +
            '<input class="rn-input" name="title" placeholder="书名 / 标题（必填）" />' +
            '<div class="rn-row">' +
              '<input class="rn-input" name="author" placeholder="作者" />' +
              '<input class="rn-input" name="rating" type="number" min="1" max="5" placeholder="评分 1-5" />' +
            '</div>' +
            '<textarea class="rn-textarea" name="content" rows="3" placeholder="笔记内容 / 摘抄…"></textarea>' +
            '<div><button class="rn-btn" type="submit">' + (state.editingId ? '保存修改' : '添加笔记') + '</button>' +
            (state.editingId ? '<button class="rn-btn rn-btn-sm" type="button" id="rn-cancel" style="margin-left:8px;">取消编辑</button>' : '') +
            '</div>' +
          '</form>' +
        '</div>' +
        '<div id="rn-list">' +
          (state.items.length === 0
            ? '<div class="rn-empty">还没有笔记，添加第一条吧～</div>'
            : list) +
        '</div>' +
      '</div>';

    var form = container.querySelector('#rn-form');
    if (form) form.addEventListener('submit', submitForm);
    var cancel = container.querySelector('#rn-cancel');
    if (cancel) cancel.addEventListener('click', function () { state.editingId = null; render(); });
    var listEl = container.querySelector('#rn-list');
    if (listEl) {
      listEl.querySelectorAll('[data-act="edit"]').forEach(function (b) {
        b.addEventListener('click', function () { startEdit(b.getAttribute('data-id')); });
      });
      listEl.querySelectorAll('[data-act="del"]').forEach(function (b) {
        b.addEventListener('click', function () { removeItem(b.getAttribute('data-id')); });
      });
    }
  }

  function mount(el, ctx) {
    container = el;
    apiPrefix = (ctx && ctx.api) ? ctx.api('') : '';
    render();
    load().catch(function () {
      if (container) {
        container.innerHTML = '<div style="text-align:center;color:#71717a;padding:24px;font-size:13px;">加载失败，请确认插件已安装且服务正常</div>';
      }
    });
  }

  function unmount() {
    container = null;
  }

  window.__lifePluginRegister({ key: PLUGIN_KEY, mount: mount, unmount: unmount });
})();
