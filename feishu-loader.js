/**
 * 星潜力网站 - 飞书多维表格内容加载器（安全云代理 & 动态渲染版）
 * 
 * 1. 已解决跨域问题（通过 Cloudflare Worker 代理）
 * 2. 已隐藏敏感密码（appSecret 在云端运行，安全防窃）
 * 3. 老师板块已实现“动态渲染”（在飞书增加/删除行，网页自动增删老师卡片）
 * 4. 完美兼容：既支持飞书内直接“拖拽/上传”图片，也支持传统的图片网址链接。
 */

const FEISHU_CONFIG = {
  // 您的 Cloudflare Worker 代理网址
  proxyUrl: 'https://feishu-proxydeploy.zhouyuanbo497.workers.dev/',
  
  // 各个页面对应的飞书 Table ID
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

// 1. 判断当前页面对应飞书的哪个工作表
function getPageName() {
  const url = decodeURIComponent(window.location.pathname);
  if (url.includes('幼小') || url.includes('youxiao')) return '幼小衔接';
  if (url.includes('思维') || url.includes('siwei')) return '思维课程';
  if (url.includes('剑桥') || url.includes('yingyu')) return '剑桥英语';
  if (url.includes('书法') || url.includes('shufa')) return '书法';
  if (url.includes('美术') || url.includes('meishu')) return '美术';
  if (url.includes('托管') || url.includes('tuoguan')) return '托管';
  if (url.includes('校区') || url.includes('xiaoqu')) return '校区介绍';
  return null;
}

// 2. 通过 Cloudflare 代理，安全、跨域地读取表格数据
async function fetchTableData(tableId) {
  // 直接呼叫您的 Cloudflare 中间人，中间人会在云端自动处理 Token
  const res = await fetch(`${FEISHU_CONFIG.proxyUrl}?tableId=${tableId}`);
  const data = await res.json();
  if (!data.data) return [];
  
  return data.data.items.map(item => {
    // 兼容逻辑：优先提取飞书直接上传的“图片”附件，没有则提取“图片链接”文本
    let imageUrls = '';
    const imgField = item.fields['图片'] || item.fields['图片链接'] || '';
    
    if (Array.isArray(imgField)) {
      // 提取直接拖拽上传到飞书的图片附件地址
      imageUrls = imgField.map(file => file.tmp_url || file.url || '').filter(Boolean).join('\n');
    } else {
      // 提取手动粘贴的外部图片网址链接
      imageUrls = imgField.trim();
    }

    return {
      module: item.fields['文本'] || item.fields['模块'] || '',
      content: item.fields['内容'] || '',
      images: imageUrls,
      visible: item.fields['是否显示'] !== false
    };
  });
}

// 3. 将数据动态应用到 HTML 页面上
function applyData(records, pageName) {
  
  // ==================== 模块 A：动态渲染老师卡片 ====================
  // 找出所有标记为“显示”的老师，并按 teacher_1, teacher_2 ... 的顺序排好
  const teacherRecords = records
    .filter(row => row.module.startsWith('teacher_') && row.visible)
    .sort((a, b) => {
      const idxA = parseInt(a.module.split('_')[1]) || 0;
      const idxB = parseInt(b.module.split('_')[1]) || 0;
      return idxA - idxB;
    });

  if (teacherRecords.length > 0) {
    const teacherContainer = document.querySelector('.teacher-cards-vertical');
    if (teacherContainer) {
      teacherContainer.innerHTML = ''; // 清空原本 HTML 里写死的陈旧内容
      
      teacherRecords.forEach(row => {
        const content = (row.content || '').trim();
        const images = (row.images || '').trim();
        
        let name = '';
        let photo = images ? images.split('\n')[0].trim() : './img/default.jpg';
        let creds = [];
        let style = [];
        let classes = [];

        // 逐行解析老师信息（姓名、资质、风格、班型等）
        const lines = content.split('\n');
        lines.forEach(line => {
          const [key, ...vals] = line.split('：');
          const val = vals.join('：').trim();
          if (!val) return;
          if (key.trim() === '姓名') name = val;
          if (key.trim() === '照片' && !images) photo = val; // 如果没在飞书直接上传图片，则使用照片字段里的链接
          if (key.trim() === '资质') creds = val.split('|').map(v => `<li>${v}</li>`);
          if (key.trim() === '风格') style = val.split('|').map(v => `<li>${v}</li>`);
          if (key.trim() === '班型') classes = val.split('|').map(v => `<li>${v}</li>`);
        });

        // 剑桥英语页面老师色块应用 green 样式，其他页面保持默认样式
        const themeClass = pageName === '剑桥英语' ? 'green' : '';

        // 动态生成一整行老师卡片
        const teacherHtml = `
          <div class="teacher-row">
            <div class="teacher-photo">
              <img src="${photo}" alt="${name}" onerror="this.src='./img/default.jpg';">
            </div>
            <div class="teacher-info">
              <h2>${name}</h2>
              <div>
                <ol>${creds.join('')}</ol>
                <ol>${style.join('')}</ol>
                <ul class="teacher-block ${themeClass}">
                  ${classes.join('')}
                </ul>
              </div>
            </div>
          </div>
        `;
        teacherContainer.insertAdjacentHTML('beforeend', teacherHtml);
      });
    }
  }

  // ==================== 模块 B：填充其他常规页面内容 ====================
  records.forEach(row => {
    const mod = (row.module || '').trim();
    const content = (row.content || '').trim();
    const images = (row.images || '').trim();
    const visible = row.visible;

    // 1. 课程介绍文字填充
    if (mod === 'course_intro') {
      const el = document.querySelector('.kctext');
      if (el) {
        const node = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
        if (node) node.textContent = content;
        else { const p = el.querySelector('p'); if (p) p.textContent = content; }
      }
    }

    // 2. 图片画廊填充（gallery_课堂展示, gallery_食品安全 等）
    if (mod.startsWith('gallery_')) {
      const sectionId = mod.replace('gallery_', '');
      const allSections = document.querySelectorAll('.content-section, [id]');
      let targetSection = null;
      allSections.forEach(s => {
        if (s.id && (s.id.includes(sectionId) || sectionId.includes(s.id))) targetSection = s;
      });
      if (targetSection) {
        targetSection.style.display = visible ? '' : 'none';
        if (!visible || !images) return;
        const gallery = targetSection.querySelector('.gallery, .Teaching-materials');
        if (gallery) {
          const imgs = images.split('\n').filter(l => l.trim());
          gallery.innerHTML = imgs.map(src => `<img src="${src.trim()}" alt="">`).join('');
        }
      }
    }

    // 3. 单张大图填充（img_schedule, img_qkb 等）
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
  });
}

// 4. 页面加载完毕后自动运行
async function loadFeishuContent() {
  const pageName = getPageName();
  if (!pageName) return;
  const tableId = FEISHU_CONFIG.tables[pageName];
  if (!tableId) return;

  try {
    // 跨域代理会在云端搞定 Token，我们直接读取表格数据
    const records = await fetchTableData(tableId);
    if (records.length > 0) {
      applyData(records, pageName);
      console.log(`✅ 飞书内容加载成功：页面 [${pageName}]，共读取到 ${records.length} 条数据。`);
    }
  } catch (e) {
    console.log('❌ 飞书加载失败，页面将显示原始默认内容', e);
  }
}

document.addEventListener('DOMContentLoaded', loadFeishuContent);
