/**
 * 星潜力网站 - 飞书内容加载器 v5
 */
const FEISHU_CONFIG = {
  appToken: 'PjsUbnliYaxZEesVC9XcLr9Yneg',
  appId: 'cli_aa99634ff3a3dcda',
  appSecret: 'O7mPRTLmSiGS9arBWONIDfdLkGRhw1wP',
  proxyBase: 'https://1437043292-dird3xyscz.ap-guangzhou.tencentscf.com',
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
 
async function feishuPost(path, body) {
  const res = await fetch(FEISHU_CONFIG.proxyBase + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}
 
async function feishuGet(path, token) {
  const res = await fetch(FEISHU_CONFIG.proxyBase + path, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}
 
async function getToken() {
  const data = await feishuPost('/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: FEISHU_CONFIG.appId,
    app_secret: FEISHU_CONFIG.appSecret
  });
  return data.tenant_access_token;
}
 
async function fetchTableData(tableId, token) {
  const data = await feishuGet(
    `/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${tableId}/records?page_size=100`,
    token
  );
  if (!data.data) return [];
  return data.data.items.map(item => ({
    module: (item.fields['文本'] || item.fields['模块'] || '').trim(),
    content: (item.fields['内容'] || '').trim(),
    images: (item.fields['图片链接'] || '').trim(),
    visible: !!(item.fields['是否显示'])
  }));
}
 
function applyAll(records) {
  records.forEach(row => {
    const mod = row.module;
    const content = row.content;
    const images = row.images;
    const visible = row.visible;
 
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
      const section = document.querySelector('#content #course-intro');
      if (section) section.style.display = visible ? '' : 'none';
    }
 
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
        if (key === '姓名') { const el = block.querySelector('h2, h3'); if (el) el.textContent = val; }
        if (key === '资质') { const ol = block.querySelectorAll('ol')[0]; if (ol) ol.innerHTML = val.split('|').map(v => `<li>${v.trim()}</li>`).join(''); }
        if (key === '风格') { const ol = block.querySelectorAll('ol')[1]; if (ol) ol.innerHTML = val.split('|').map(v => `<li>${v.trim()}</li>`).join(''); }
        if (key === '班型') { const ul = block.querySelector('ul.teacher-block'); if (ul) ul.innerHTML = val.split('|').map(v => `<li>${v.trim()}</li>`).join(''); }
      });
      if (images) { const img = block.querySelector('.teacher-photo img'); if (img) img.src = images.split('\n')[0].trim(); }
    }
 
    if (mod.startsWith('img_') && images) {
      const map = { 'schedule': '#schedule img', 'qkb': '#enlightenment-class img', 'bnb': '#junior-class img', 'qnb': '#full-year-class img' };
      const sel = map[mod.replace('img_', '')];
      if (sel) { const el = document.querySelector('#content ' + sel); if (el) el.src = images.split('\n')[0].trim(); }
    }
 
    if (mod.startsWith('gallery_')) {
      const key = mod.replace('gallery_', '');
      const section = document.querySelector('#content #' + key);
      if (!section) return;
      section.style.display = visible ? '' : 'none';
      if (!visible || !images) return;
      const gallery = section.querySelector('.gallery');
      if (gallery) {
        gallery.innerHTML = images.split('\n').filter(l => l.trim()).map(src => `<img src="${src.trim()}" alt="">`).join('');
      }
    }
  });
}
 
function hookMenuSwitch() {
  const observer = new MutationObserver(function() {
    if (window._feishuRecords && window._feishuRecords.length > 0) {
      setTimeout(() => applyAll(window._feishuRecords), 50);
    }
  });
  const content = document.getElementById('content');
  if (content) observer.observe(content, { childList: true });
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
