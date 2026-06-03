// ============================================================
//  ALUMIBRO 產品開發預算工具 — script.js (GitHub Pages 版)
//  API 後端：Apps Script
// ============================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbwEWGkNSfr93RVwMS-pn3RSlpRUloRzwp0DKnTvyQirG1Q5PXELaN75elcyHKea81K7Zw/exec';

// Apps Script API 呼叫封裝
async function callAPI(action, data) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, ...data })
  });
  return res.json();
}

// ── 設定 ────────────────────────────────────────────────────
const CATS = ['材料', '加工', '設備', '測試', '設計', '其他'];
const CAT_COLORS = {
  '材料': '#2c5f8a', '加工': '#6a6030', '設備': '#6a3060',
  '測試': '#2a6040', '設計': '#8a2060', '其他': '#8a4020'
};
const CAT_BG = {
  '材料': '#e8f0f8', '加工': '#f0f0e8', '設備': '#f0e8f0',
  '測試': '#e8f8ec', '設計': '#f8e8f0', '其他': '#f8f0e8'
};

// 快速範本庫
const TEMPLATES = [
  { id:'t1',  name:'鋁型材 2020型',     cat:'材料', qty:30,  unit:'條', price:130 },
  { id:'t2',  name:'鋁型材 3030重型',   cat:'材料', qty:20,  unit:'條', price:250 },
  { id:'t3',  name:'鋁型材 4040輕型',   cat:'材料', qty:10,  unit:'條', price:360 },
  { id:'t4',  name:'M4螺絲/螺母/墊片組',cat:'材料', qty:10,  unit:'包', price:40  },
  { id:'t5',  name:'M6螺絲/螺母/墊片組',cat:'材料', qty:10,  unit:'包', price:60  },
  { id:'t6',  name:'三角連結塊',         cat:'材料', qty:20,  unit:'個', price:15  },
  { id:'t7',  name:'靜音輪/腳杯固定器', cat:'材料', qty:4,   unit:'個', price:30  },
  { id:'t8',  name:'CNC 銑削加工',       cat:'加工', qty:1,   unit:'式', price:8000},
  { id:'t9',  name:'表面陽極處理',       cat:'加工', qty:1,   unit:'式', price:5000},
  { id:'t10', name:'雷射切割',           cat:'加工', qty:1,   unit:'式', price:3000},
  { id:'t11', name:'產品外觀設計',       cat:'設計', qty:1,   unit:'式', price:15000},
  { id:'t12', name:'3D 建模費用',        cat:'設計', qty:1,   unit:'式', price:8000},
  { id:'t13', name:'樣品測試費用',       cat:'測試', qty:1,   unit:'式', price:3000},
  { id:'t14', name:'耐壓/耐重測試',      cat:'測試', qty:1,   unit:'式', price:5000},
  { id:'t15', name:'包裝材料',           cat:'材料', qty:50,  unit:'套', price:80  },
  { id:'t16', name:'攝影/拍照費用',      cat:'其他', qty:1,   unit:'式', price:6000},
];

// ── 全域狀態 ─────────────────────────────────────────────────
let rows   = [];
let nextId = 1;
let currentBudgetId = null;

// ── 初始化 ───────────────────────────────────────────────────
window.onload = function () {
  setDefaultDate();
  renderTemplateList();
  loadBudgets();
};

function setDefaultDate() {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  document.getElementById('proj-date').value = d.toISOString().slice(0, 10);
}

// ── 視圖切換 ─────────────────────────────────────────────────
function showView(name) {
  document.getElementById('view-list').classList.toggle('hidden', name !== 'list');
  document.getElementById('view-editor').classList.toggle('hidden', name !== 'editor');
  if (name === 'list') loadBudgets();
}

// ── 新建預算 ─────────────────────────────────────────────────
function newBudget() {
  currentBudgetId = 'BUDGET-' + Date.now();
  document.getElementById('budget-id-badge').textContent = currentBudgetId;

  // 清空表單
  ['proj-name','proj-owner','proj-desc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('proj-type').selectedIndex = 0;
  document.getElementById('buffer-pct').value = 10;
  setDefaultDate();

  // 預設示範項目
  rows = []; nextId = 1;
  addRow('鋁型材 (依規格)', '材料', 30, '條', 200);
  addRow('螺絲/連結塊配件組', '材料', 5, '式', 500);
  addRow('加工費', '加工', 1, '式', 8000);
  addRow('產品設計', '設計', 1, '式', 15000);

  renderTable();
  recalc();
  showView('editor');
}

// ── 載入已儲存預算（清單頁）─────────────────────────────────
async function loadBudgets() {
  document.getElementById('budget-list-container').innerHTML =
    '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 載入中...</div>';
  try {
    const res = await callAPI('loadBudgets');
    onBudgetsLoaded(res);
  } catch(err) {
    document.getElementById('budget-list-container').innerHTML =
      `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>載入失敗：${err.message}</p></div>`;
  }
}

function onBudgetsLoaded(res) {
  const list = res.list || [];
  document.getElementById('list-count').textContent = `共 ${list.length} 筆`;

  if (list.length === 0) {
    document.getElementById('budget-list-container').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-folder-open"></i>
        <p>尚無預算資料</p>
        <button class="btn accent" onclick="newBudget()" style="margin-top:12px">
          <i class="fas fa-plus"></i> 建立第一筆預算
        </button>
      </div>`;
    return;
  }

  const html = `<div class="list-grid">${list.map(b => budgetCard(b)).join('')}</div>`;
  document.getElementById('budget-list-container').innerHTML = html;
}

function budgetCard(b) {
  const total = parseInt(b.withBuffer || b.total || 0);
  return `
  <div class="budget-card" onclick="loadToEditor('${b.budgetId}')">
    <div class="bc-name">${escHtml(b.projName || '未命名專案')}</div>
    <div class="bc-type">${escHtml(b.projType || '')}</div>
    <div class="bc-meta">
      <span><i class="fas fa-user"></i> ${escHtml(b.projOwner || '—')}</span>
      <span><i class="fas fa-calendar"></i> ${b.projDate || '—'}</span>
      <span><i class="fas fa-clock"></i> 更新 ${b.updatedAt || '—'}</span>
    </div>
    <div class="bc-total">NT$${fmt(total)}</div>
    <div class="bc-actions">
      <button class="bc-btn edit" onclick="event.stopPropagation();loadToEditor('${b.budgetId}')">
        <i class="fas fa-edit"></i> 編輯
      </button>
      <button class="bc-btn export-s" onclick="event.stopPropagation();exportSheetById('${b.budgetId}')">
        <i class="fas fa-table"></i> 展開Sheet
      </button>
      <button class="bc-btn del" onclick="event.stopPropagation();deleteBudgetById('${b.budgetId}')">
        <i class="fas fa-trash"></i>
      </button>
    </div>
  </div>`;
}

// ── 載入預算到編輯器 ─────────────────────────────────────────
async function loadToEditor(budgetId) {
  toast('載入中...', 'info');
  try {
    const res = await callAPI('loadBudgets');
    const b = (res.list || []).find(x => x.budgetId === budgetId);
    if (!b) { toast('找不到此預算', 'error'); return; }

    currentBudgetId = b.budgetId;
    document.getElementById('budget-id-badge').textContent = budgetId;
    document.getElementById('proj-name').value  = b.projName  || '';
    document.getElementById('proj-type').value  = b.projType  || '餐車/攤車';
    document.getElementById('proj-owner').value = b.projOwner || '';
    document.getElementById('proj-date').value  = b.projDate  || '';
    document.getElementById('proj-desc').value  = b.projDesc  || '';
    document.getElementById('buffer-pct').value = b.bufferPct || 10;

    rows = (b.rows || []).map(r => ({...r, id: nextId++}));
    renderTable();
    recalc();
    showView('editor');
  } catch(err) {
    toast('載入失敗：' + err.message, 'error');
  }
}

// ── 資料列操作 ───────────────────────────────────────────────
function addRowDefault() {
  rows.push({ id: nextId++, item: '', cat: '材料', qty: 1, unit: '件', price: 0, note: '' });
  renderTable();
  recalc();
  // 對焦到新行的名稱欄
  setTimeout(() => {
    const inputs = document.querySelectorAll('#budget-body tr:last-child td:nth-child(2) input');
    if (inputs[0]) inputs[0].focus();
  }, 50);
}

function addRow(item='', cat='材料', qty=1, unit='件', price=0, note='') {
  rows.push({ id: nextId++, item, cat, qty, unit, price, note });
}

function deleteRow(id) {
  rows = rows.filter(r => r.id !== id);
  renderTable();
  recalc();
}

function updateRow(id, field, val) {
  const r = rows.find(r => r.id === id);
  if (!r) return;
  if (field === 'qty' || field === 'price') r[field] = parseFloat(val) || 0;
  else r[field] = val;
  // 只重算，不重畫整張表（避免游標跳走）
  recalcAmountCell(id);
  recalc();
}

function recalcAmountCell(id) {
  const r = rows.find(r => r.id === id);
  if (!r) return;
  const cell = document.getElementById(`amount-${id}`);
  if (cell) cell.textContent = 'NT$' + fmt(r.qty * r.price);
}

// ── 渲染表格 ─────────────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('budget-body');
  tbody.innerHTML = '';

  rows.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-row', '#' + (i+1));
    tr.innerHTML = `
      <td style="color:#999;font-size:11px;text-align:center;padding-left:8px">${i+1}</td>
      <td data-label="項目名稱"><input type="text" value="${escHtml(r.item)}" placeholder="項目說明"
          oninput="updateRow(${r.id},'item',this.value)" style="width:100%;min-width:130px"></td>
      <td data-label="類別">
        <select onchange="updateRow(${r.id},'cat',this.value)" style="width:72px">
          ${CATS.map(c=>`<option${c===r.cat?' selected':''}>${c}</option>`).join('')}
        </select>
      </td>
      <td data-label="數量"><input type="number" min="0" step="any" value="${r.qty}"
          oninput="updateRow(${r.id},'qty',this.value)"></td>
      <td data-label="單位"><input type="text" value="${escHtml(r.unit)}" placeholder="件/式/hr"
          oninput="updateRow(${r.id},'unit',this.value)" style="width:55px"></td>
      <td data-label="單價 (NT$)"><input type="number" min="0" step="any" value="${r.price}"
          oninput="updateRow(${r.id},'price',this.value)"></td>
      <td class="amount" id="amount-${r.id}" data-label="小計">NT$${fmt(r.qty * r.price)}</td>
      <td data-label="備註"><input type="text" value="${escHtml(r.note)}" placeholder="選填"
          oninput="updateRow(${r.id},'note',this.value)" style="width:90px"></td>
      <td class="del-cell">
        <button class="del-btn" onclick="deleteRow(${r.id})" aria-label="刪除">
          <i class="fas fa-times"></i>
        </button>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ── 重新計算匯總 ─────────────────────────────────────────────
function recalc() {
  const subtot = rows.reduce((s, r) => s + (r.qty||0) * (r.price||0), 0);
  const tax    = subtot * 0.05;
  const total  = subtot + tax;
  const buf    = parseFloat(document.getElementById('buffer-pct').value) || 0;
  const withBuf= total * (1 + buf / 100);

  document.getElementById('sum-subtotal').textContent = 'NT$' + fmt(subtot);
  document.getElementById('sum-tax').textContent      = 'NT$' + fmt(tax);
  document.getElementById('sum-total').textContent    = 'NT$' + fmt(total);
  document.getElementById('sum-buffer').textContent   = 'NT$' + fmt(withBuf);

  updateBar(subtot);
  updateLegend(subtot);
}

function updateBar(total) {
  const bar = document.getElementById('budget-bar');
  if (!total) { bar.innerHTML = '<div class="bar-seg" style="width:100%;background:#eee"></div>'; return; }
  const ct = catTotals();
  bar.innerHTML = CATS.filter(c => ct[c] > 0).map(c =>
    `<div class="bar-seg" style="width:${(ct[c]/total*100).toFixed(1)}%;background:${CAT_COLORS[c]}"></div>`
  ).join('');
}

function updateLegend(total) {
  const leg = document.getElementById('category-legend');
  if (!total) { leg.innerHTML = ''; return; }
  const ct = catTotals();
  leg.innerHTML = CATS.filter(c => ct[c] > 0).map(c =>
    `<span class="legend-chip" style="background:${CAT_BG[c]};color:${CAT_COLORS[c]}">
      ${c} ${(ct[c]/total*100).toFixed(0)}%
    </span>`
  ).join('');
}

function catTotals() {
  const ct = {};
  CATS.forEach(c => ct[c] = 0);
  rows.forEach(r => ct[r.cat] = (ct[r.cat]||0) + (r.qty||0)*(r.price||0));
  return ct;
}

// ── 儲存至 Google Sheets ─────────────────────────────────────
async function saveBudget() {
  const projName = document.getElementById('proj-name').value.trim();
  if (!projName) { toast('請填寫專案名稱', 'error'); document.getElementById('proj-name').focus(); return; }

  const data = getBudgetData();
  toast('儲存中...', 'info');

  try {
    const res = await callAPI('saveBudget', { data });
    if (res.ok) toast(`已儲存！總計 NT$${fmt(res.total)}`, 'success');
    else toast('儲存失敗：' + res.msg, 'error');
  } catch(err) {
    toast('儲存失敗：' + err.message, 'error');
  }
}

// ── 展開至獨立 Sheet ─────────────────────────────────────────
async function exportToSheet() {
  const data = getBudgetData();
  toast('正在建立 Sheet...', 'info');

  try {
    const res = await callAPI('exportSheet', { data });
    if (res.ok) toast(`已建立 Sheet：${res.sheetName} ✅`, 'success');
    else toast('建立失敗：' + res.msg, 'error');
  } catch(err) {
    toast('失敗：' + err.message, 'error');
  }
}

async function exportSheetById(budgetId) {
  toast('正在建立 Sheet...', 'info');
  try {
    const res = await callAPI('loadBudgets');
    const b = (res.list || []).find(x => x.budgetId === budgetId);
    if (!b) { toast('找不到此預算', 'error'); return; }
    const r = await callAPI('exportSheet', { data: b });
    if (r.ok) toast(`已建立 Sheet：${r.sheetName} ✅`, 'success');
    else toast('建立失敗：' + r.msg, 'error');
  } catch(err) {
    toast('失敗：' + err.message, 'error');
  }
}

// ── 刪除預算 ─────────────────────────────────────────────────
async function deleteBudgetById(budgetId) {
  if (!confirm('確定要刪除此預算？此動作無法復原。')) return;
  try {
    const res = await callAPI('deleteBudget', { budgetId });
    if (res.ok) { toast('已刪除', 'success'); loadBudgets(); }
    else toast('刪除失敗：' + res.msg, 'error');
  } catch(err) {
    toast('失敗：' + err.message, 'error');
  }
}

// ── 匯出 CSV（本機下載）─────────────────────────────────────
function exportCSV() {
  const name = document.getElementById('proj-name').value || '預算';
  let csv = '\uFEFF項目,類別,數量,單位,單價,小計,備註\n';
  rows.forEach(r => {
    csv += `"${r.item}","${r.cat}",${r.qty},"${r.unit}",${r.price},${r.qty*r.price},"${r.note}"\n`;
  });
  const sub = rows.reduce((s,r)=>s+(r.qty||0)*(r.price||0),0);
  csv += `\n小計,,,,,,${Math.round(sub)}\n稅金(5%),,,,,,${Math.round(sub*0.05)}\n含稅總計,,,,,,${Math.round(sub*1.05)}\n`;

  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `ALUMIBRO_預算_${name}.csv`;
  a.click();
}

// ── 快速範本 ─────────────────────────────────────────────────
function renderTemplateList() {
  document.getElementById('template-list').innerHTML = TEMPLATES.map(t => `
    <label class="tpl-item" id="tpl-${t.id}">
      <input type="checkbox" value="${t.id}" onchange="toggleTemplate('${t.id}',this.checked)">
      <div>
        <div class="tpl-name">${t.name}</div>
        <div class="tpl-meta">${t.cat}｜${t.qty} ${t.unit}｜NT$${fmt(t.price)}/unit</div>
      </div>
    </label>`).join('');
}

function toggleTemplate(id, checked) {
  document.getElementById('tpl-'+id).classList.toggle('selected', checked);
}

function addRowFromTemplate() {
  document.getElementById('template-modal').classList.remove('hidden');
}

function applyTemplate() {
  const checked = [...document.querySelectorAll('#template-list input:checked')];
  if (!checked.length) { toast('請至少選擇一個項目', 'error'); return; }
  checked.forEach(cb => {
    const t = TEMPLATES.find(x => x.id === cb.value);
    if (t) addRow(t.name, t.cat, t.qty, t.unit, t.price);
  });
  // 清除勾選
  checked.forEach(cb => { cb.checked = false; toggleTemplate(cb.value, false); });
  closeModal('template-modal');
  renderTable();
  recalc();
  toast(`已套用 ${checked.length} 個項目`, 'success');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ── 工具函式 ─────────────────────────────────────────────────
function getBudgetData() {
  return {
    budgetId:   currentBudgetId,
    projName:   document.getElementById('proj-name').value.trim(),
    projType:   document.getElementById('proj-type').value,
    projOwner:  document.getElementById('proj-owner').value.trim(),
    projDate:   document.getElementById('proj-date').value,
    projDesc:   document.getElementById('proj-desc').value.trim(),
    bufferPct:  parseFloat(document.getElementById('buffer-pct').value) || 0,
    rows:       rows.map(({id,...r}) => r)  // 不傳前端用的 id
  };
}

function fmt(n) { return Math.round(n).toLocaleString('zh-TW'); }
function escHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function toast(msg, type='success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.add('hidden'), 3500);
}