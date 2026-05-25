/**
 * 星潜力网站 - 飞书内容加载器 v4
 * 修复：菜单切换时重新应用所有飞书数据
 */
const FEISHU_CONFIG = {
  appToken: 'PjsUbnliYaxZEesVC9XcLr9Yneg',
  appId: 'cli_aa99634ff3a3dcda',
  appSecret: 'O7mPRTLmSiGS9arBWONIDfdLkGRhw1wP',
  proxyBase: 'https://feishu-proxy.zhouyuanbo497.workers.dev/proxy',
  tables: {
    '幼小衔接': 'tblvhEbqTVUvQ4fY',
    '思维课程': 'tblMCkfrK0Qo2JSV',
    '剑桥英语': 'tblMoC3BgrpNZxmx',
    '书法':     'tblxBfDwpl4kDYn0',
    '美术':     'tblp4iZC761S3Hcl',
    '托管':     'tbllCthsVm7KFeWQ',
    '校区介绍': 'tblVtVgF6RkyM6wc'
  }
};

function getPageName() {
  const url = decodeURIComponent(window.location.pathname);
  if (url.includes('幼小')) return '幼小衔接';
  if (url.includes('思维')) return '思维课程';
  if (url.includes('剑桥')) return '剑桥英语';
  if (url.includes('书法')) return '书法';
  if (url.includes('美术')) return '美术';
  if (url.includes('托管')) return '托管';
  if (url.includes('校区')) return '校区介绍';
  return null;
}

async function getToken() {
  const res = await fetch(FEISHU_CONFIG.proxyBase + '/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_CONFIG.appId, app_secret: FEISHU_CONFIG.appSecret })
  });
  const data = await res.json();
  return data.tenant_access_token;
}

async function fetchTableData(tableId, token) {
  const res = await fetch(
    `${FEISHU_CONFIG.proxyBase}/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${tableId}/records?page_size=100`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!data.data) return [];
  return data.data.items.map(item => ({
    module: (item.fields['文本'] || item.fields['模块'] || '').trim(),
    content: (item.fields['内容'] || '').trim(),
    images: (item.fields['图片链接'] || '').trim(),
    visible: !!(item.fields['是否显示'])
  }));
}

// 把飞书数据应用到当前显示的内容区域
function applyAll(records) {
  records.forEach(row => {
    const mod = row.module;
    const content = row.content;
    const images = row.images;
    const visible = row.visible;

    // 课程介绍文字
    if (mod === 'course_intro') {
      const kctext = document.querySelector('#content .kctext');
      if (kctext && content) {
        for (let node of kctext.childNodes) {
          if (node.nodeType === 3 && node.textContent.trim()) {
            node.textContent = '\n' + content + '\n';
            break;
          }
        }
      }
      // 显示/隐藏整个课程介绍区块
      const section = document.querySelector('#content #course-intro');
      if (section) section.style.display = visible ? '' : 'none';
    }

    // 老师模块
    if (mod.startsWith('teacher_')) {
      const idx = parseInt(mod.split('_')[1]) - 1;
      const rows = document.querySelectorAll('#content .teacher-row');
      if (!rows[idx]) return;
      const block = rows[idx];
      block.style.display = visible ? '' : 'none';
      if (!visible) return;

      const lines = content.split('\n');
      lines.forEach(line => {
        const colonIdx = line.indexOf('：');
        if (colonIdx === -1) return;
        const key = line.substring(0, colonIdx).trim();
        const val = line.substring(colonIdx + 1).trim();
        if (key === '姓名') {
          const el = block.querySelector('h2, h3');
          if (el) el.textContent = val;
        }
        if (key === '资质') {
          const ol = block.querySelectorAll('ol')[0];
          if (ol) ol.innerHTML = val.split('|').map(v => `<li>${v.trim()}</li>`).join('');
        }
        if (key === '风格') {
          const ol = block.querySelectorAll('ol')[1];
          if (ol) ol.innerHTML = val.split('|').map(v => `<li>${v.trim()}</li>`).join('');
        }
        if (key === '班型') {
          const ul = block.querySelector('ul.teacher-block');
          if (ul) ul.innerHTML = val.split('|').map(v => `<li>${v.trim()}</li>`).join('');
        }
      });
      if (images) {
        const img = block.querySelector('.teacher-photo img');
        if (img) img.src = images.split('\n')[0].trim();
      }
    }

    // 单张图片
    if (mod.startsWith('img_') && images) {
      const key = mod.replace('img_', '');
      const map = {
        'schedule': '#schedule img',
        'qkb': '#enlightenment-class img',
        'bnb': '#junior-class img',
        'qnb': '#full-year-class img',
      };
      const sel = map[key];
      if (sel) {
        const el = document.querySelector('#content ' + sel);
        if (el) el.src = images.split('\n')[0].trim();
      }
    }

    // 图片画廊
    if (mod.startsWith('gallery_')) {
      const key = mod.replace('gallery_', '');
      const section = document.querySelector('#content #' + key);
      if (!section) return;
      section.style.display = visible ? '' : 'none';
      if (!visible || !images) return;
      const gallery = section.querySelector('.gallery');
      if (gallery) {
        const imgs = images.split('\n').filter(l => l.trim());
        gallery.innerHTML = imgs.map(src => `<img src="${src.trim()}" alt="">`).join('');
      }
    }
  });
}

// 拦截菜单切换，在切换后重新应用飞书数据
function hookMenuSwitch() {
  // 监听#content的DOM变化，每次切换后重新应用
  const observer = new MutationObserver(function() {
    if (window._feishuRecords && window._feishuRecords.length > 0) {
      setTimeout(() => applyAll(window._feishuRecords), 50);
    }
  });
  const content = document.getElementById('content');
  if (content) {
    observer.observe(content, { childList: true, subtree: false });
  }
}

async function loadFeishuContent() {
  const pageName = getPageName();
  if (!pageName) return;
  const tableId = FEISHU_CONFIG.tables[pageName];
  if (!tableId) return;
  try {
    const token = await getToken();
    const records = await fetchTableData(tableId, token);
    if (records.length > 0) {
      window._feishuRecords = records;
      applyAll(records);
      hookMenuSwitch();
      console.log(`✅ 飞书内容加载成功：${pageName}，共${records.length}条`);
    }
  } catch(e) {
    console.log('飞书加载失败，使用原始内容', e);
  }
}

document.addEventListener('DOMContentLoaded', loadFeishuContent);
