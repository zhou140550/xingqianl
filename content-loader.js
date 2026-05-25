/**
 * 星潜力网站 — 内容自动加载器
 * 从后台管理页面保存的数据中读取内容，自动更新页面
 */
(function() {
  const saved = localStorage.getItem('xql_content');
  if (!saved) return;

  let data;
  try { data = JSON.parse(saved); } catch(e) { return; }

  // 判断当前是哪个页面
  const url = decodeURIComponent(window.location.pathname);
  let pageKey = null;
  if (url.includes('幼小') || url.includes('youxiao')) pageKey = 'youxiao';
  else if (url.includes('思维') || url.includes('siwei')) pageKey = 'siwei';
  else if (url.includes('剑桥') || url.includes('yingyu')) pageKey = 'yingyu';
  else if (url.includes('书法') || url.includes('shufa')) pageKey = 'shufa';
  else if (url.includes('美术') || url.includes('meishu')) pageKey = 'meishu';
  else if (url.includes('托管') || url.includes('tuoguan')) pageKey = 'tuoguan';

  if (!pageKey || !data[pageKey]) return;
  const d = data[pageKey];

  document.addEventListener('DOMContentLoaded', function() {
    // 1. 更新课程介绍文字
    if (d.course_intro) {
      const kctext = document.querySelector('.kctext');
      if (kctext) {
        // 只替换纯文字节点，保留子元素结构
        const firstText = [...kctext.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
        if (firstText) firstText.textContent = d.course_intro;
        else {
          // 没有纯文字节点，找第一个纯文字div/p
          const simple = kctext.querySelector('p, div:not([class])');
          if (simple && !simple.children.length) simple.textContent = d.course_intro;
        }
      }
    }

    // 2. 更新老师简介
    if (d.teachers) {
      const rows = document.querySelectorAll('.teacher-row');
      d.teachers.forEach((t, i) => {
        if (!rows[i]) return;
        const nameEl = rows[i].querySelector('h2, h3');
        if (nameEl) nameEl.textContent = t.name;
        const photoEl = rows[i].querySelector('.teacher-photo img');
        if (photoEl && t.photo) photoEl.src = t.photo;

        // 更新资质列表（第一个ol）
        const ols = rows[i].querySelectorAll('ol');
        if (ols[0] && t.creds) {
          const lines = t.creds.split('\n').filter(l => l.trim());
          ols[0].innerHTML = lines.map(l => `<li>${l.trim()}</li>`).join('');
        }
        if (ols[1] && t.style) {
          const lines = t.style.split('\n').filter(l => l.trim());
          ols[1].innerHTML = lines.map(l => `<li>${l.trim()}</li>`).join('');
        }
        // 更新班型（ul.teacher-block）
        const ul = rows[i].querySelector('ul.teacher-block');
        if (ul && t.classes) {
          const lines = t.classes.split('\n').filter(l => l.trim());
          ul.innerHTML = lines.map(l => `<li>${l.trim()}</li>`).join('');
        }
      });
    }

    // 3. 幼小衔接专属：更新课程表和大纲图片
    if (pageKey === 'youxiao') {
      if (d.schedule_img) {
        const img = document.querySelector('#schedule img');
        if (img) img.src = d.schedule_img;
      }
      if (d.price_qkb) {
        const img = document.querySelector('#enlightenment-class img');
        if (img) img.src = d.price_qkb;
      }
      if (d.price_bnb) {
        const img = document.querySelector('#junior-class img');
        if (img) img.src = d.price_bnb;
      }
      if (d.price_qnb) {
        const img = document.querySelector('#full-year-class img');
        if (img) img.src = d.price_qnb;
      }
    }
  });
})();
