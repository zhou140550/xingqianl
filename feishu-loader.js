/**
 * 星潜力网站 - 飞书多维表格内容加载器
 * 
 * 飞书表格地址: https://ccnrji5wj10d.feishu.cn/base/PjsUbnliYaxZEesVC9XcLr9Yneg
 * 
 * 表格结构（每个课程表都一样）：
 * - 文本列：模块名称（course_intro/teacher_1/teacher_2.../gallery_课堂展示/schedule_img等）
 * - 内容列：具体文字内容
 * - 图片链接列：图片URL（多张用换行分隔）
 * - 是否显示列：复选框（不勾选=隐藏该模块）
 */

const FEISHU_CONFIG = {
  appToken: 'PjsUbnliYaxZEesVC9XcLr9Yneg',
  appId: 'cli_aa99634ff3a3dcda',
  appSecret: 'O7mPRTLmSiGS9arBWONIDfdLkGRhw1wP',
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

// 判断当前页面对应哪个表
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

// 获取飞书Token
async function getToken() {
  const res = await fetch('https://feishu-proxy.zhouyuanbo497.workers.dev/proxy/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_CONFIG.appId, app_secret: FEISHU_CONFIG.appSecret })
  });
  const data = await res.json();
  return data.tenant_access_token;
}

// 读取表格数据
async function fetchTableData(tableId, token) {
  const res = await fetch(
    `https://feishu-proxy.zhouyuanbo497.workers.dev/proxy/open-apis/bitable/v1/apps/${FEISHU_CONFIG.appToken}/tables/${tableId}/records?page_size=100`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await res.json();
  if (!data.data) return [];
  return data.data.items.map(item => ({
    module: item.fields['文本'] || item.fields['模块'] || '',
    content: item.fields['内容'] || '',
    images: item.fields['图片链接'] || '',
    visible: item.fields['是否显示'] !== false
  }));
}

// 把数据应用到页面
function applyData(records) {
  records.forEach(row => {
    const mod = (row.module || '').trim();
    const content = (row.content || '').trim();
    const images = (row.images || '').trim();
    const visible = row.visible;

    // === 课程介绍文字 ===
    if (mod === 'course_intro') {
      const el = document.querySelector('.kctext');
      if (el) {
        const node = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
        if (node) node.textContent = content;
        else { const p = el.querySelector('p'); if (p) p.textContent = content; }
      }
    }

    // === 老师模块 teacher_1, teacher_2, teacher_3 ... ===
    if (mod.startsWith('teacher_')) {
      const idx = parseInt(mod.split('_')[1]) - 1;
      const rows = document.querySelectorAll('.teacher-row');
      if (rows[idx]) {
        const block = rows[idx];
        // 显示/隐藏整个老师块
        block.style.display = visible ? '' : 'none';
        if (!visible) return;

        // 解析内容：每行一个字段
        // 格式：
        // 姓名：xxx
        // 资质：aaa|bbb|ccc
        // 风格：aaa|bbb
        // 班型：aaa|bbb
        // 照片：https://...
        const lines = content.split('\n');
        lines.forEach(line => {
          const [key, ...vals] = line.split('：');
          const val = vals.join('：').trim();
          if (!val) return;
          if (key.trim() === '姓名') {
            const el = block.querySelector('h2, h3');
            if (el) el.textContent = val;
          }
          if (key.trim() === '照片') {
            const el = block.querySelector('.teacher-photo img');
            if (el) el.src = val;
          }
          if (key.trim() === '资质') {
            const ol = block.querySelectorAll('ol')[0];
            if (ol) ol.innerHTML = val.split('|').map(v => `<li>${v}</li>`).join('');
          }
          if (key.trim() === '风格') {
            const ol = block.querySelectorAll('ol')[1];
            if (ol) ol.innerHTML = val.split('|').map(v => `<li>${v}</li>`).join('');
          }
          if (key.trim() === '班型') {
            const ul = block.querySelector('ul.teacher-block');
            if (ul) ul.innerHTML = val.split('|').map(v => `<li>${v}</li>`).join('');
          }
        });
        // 图片链接也可以单独放图片链接列
        if (images) {
          const el = block.querySelector('.teacher-photo img');
          if (el) el.src = images.split('\n')[0].trim();
        }
      }
    }

    // === 图片画廊 gallery_课堂展示, gallery_食品安全 等 ===
    if (mod.startsWith('gallery_')) {
      const sectionId = mod.replace('gallery_', '');
      // 找对应section
      let section = document.querySelector(`[data-target="${sectionId}"]`);
      // 通过内容区找
      const allSections = document.querySelectorAll('.content-section, [id]');
      let targetSection = null;
      allSections.forEach(s => {
        if (s.id && (s.id.includes(sectionId) || sectionId.includes(s.id))) targetSection = s;
      });
      if (targetSection) {
        targetSection.style.display = visible ? '' : 'none';
        if (!visible || !images) return;
        const gallery = targetSection.querySelector('.gallery');
        if (gallery) {
          const imgs = images.split('\n').filter(l => l.trim());
          gallery.innerHTML = imgs.map(src => `<img src="${src.trim()}" alt="">`).join('');
        }
      }
    }

    // === 单张图片 img_schedule, img_qkb, img_bnb, img_qnb 等 ===
    if (mod.startsWith('img_') && images) {
      const key = mod.replace('img_', '');
      const idMap = {
        'schedule': '#schedule img',
        'qkb': '#enlightenment-class img',
        'bnb': '#junior-class img',
        'qnb': '#full-year-class img',
      };
      const sel = idMap[key];
      if (sel) {
        const el = document.querySelector(sel);
        if (el) el.src = images.split('\n')[0].trim();
      }
    }

    // === 校区介绍轮播图 gallery_banner ===
    // === 家长好评 gallery_reviews ===
    // 这两个走gallery_逻辑，已覆盖
  });
}

// 主函数
async function loadFeishuContent() {
  const pageName = getPageName();
  if (!pageName) return;
  const tableId = FEISHU_CONFIG.tables[pageName];
  if (!tableId) return;

  try {
    const token = await getToken();
    const records = await fetchTableData(tableId, token);
    if (records.length > 0) {
      applyData(records);
      console.log(`✅ 飞书内容加载成功：${pageName}，共${records.length}条`);
    }
  } catch (e) {
    console.log('飞书加载失败，使用原始内容', e);
  }
}

document.addEventListener('DOMContentLoaded', loadFeishuContent);
