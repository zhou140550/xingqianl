/**
 * 星潜力网站 - 内容加载器 v6
 * 读取本地 data.json 文件（由同步工具生成）
 */

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

function applyAll(records) {
  window._feishuRecords = records;
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
      content.split('\n').forEach(line => {
        const colonIdx = line.indexOf('：');
        if (colonIdx === -1) return;
        const key = line.substring(0, colonIdx).trim();
        const val = line.substring(colonIdx + 1).trim();
        if (key === '姓名') { const el = block.querySelector('h2,h3'); if (el) el.textContent = val; }
        if (key === '资质') { const ol = block.querySelectorAll('ol')[0]; if (ol) ol.innerHTML = val.split('|').map(v=>`<li>${v.trim()}</li>`).join(''); }
        if (key === '风格') { const ol = block.querySelectorAll('ol')[1]; if (ol) ol.innerHTML = val.split('|').map(v=>`<li>${v.trim()}</li>`).join(''); }
        if (key === '班型') { const ul = block.querySelector('ul.teacher-block'); if (ul) ul.innerHTML = val.split('|').map(v=>`<li>${v.trim()}</li>`).join(''); }
      });
      if (images) { const img = block.querySelector('.teacher-photo img'); if (img) img.src = images.split('\n')[0].trim(); }
    }

    if (mod.startsWith('img_') && images) {
      const map = { 'schedule':'#schedule img', 'qkb':'#enlightenment-class img', 'bnb':'#junior-class img', 'qnb':'#full-year-class img' };
      const sel = map[mod.replace('img_','')];
      if (sel) { const el = document.querySelector('#content '+sel); if (el) el.src = images.split('\n')[0].trim(); }
    }

    if (mod.startsWith('gallery_')) {
      const key = mod.replace('gallery_','');
      const section = document.querySelector('#content #'+key);
      if (!section) return;
      section.style.display = visible ? '' : 'none';
      if (!visible || !images) return;
      const gallery = section.querySelector('.gallery');
      if (gallery) gallery.innerHTML = images.split('\n').filter(l=>l.trim()).map(src=>`<img src="${src.trim()}" alt="">`).join('');
    }
  });
}

function hookMenuSwitch() {
  const observer = new MutationObserver(function() {
    if (window._feishuRecords) setTimeout(() => applyAll(window._feishuRecords), 50);
  });
  const content = document.getElementById('content');
  if (content) observer.observe(content, { childList: true });
}

async function loadContent() {
  const pageName = getPageName();
  if (!pageName) return;
  try {
    const res = await fetch('./data.json?t=' + Date.now());
    const allData = await res.json();
    const records = allData[pageName];
    if (records && records.length > 0) {
      applyAll(records);
      hookMenuSwitch();
      console.log(`✅ 内容加载成功：${pageName}，共${records.length}条`);
    }
  } catch(e) {
    console.log('内容加载失败，使用原始内容', e);
  }
}

document.addEventListener('DOMContentLoaded', loadContent);
