// i18n/i18n.js
// Minimal, framework-free i18n. Purely presentational — never touches
// parsing/AI/highlight logic, only swaps displayed text. Two ways to use it:
//   1. Static markup: give an element `data-i18n="key"` (textContent),
//      `data-i18n-placeholder="key"` (input/textarea placeholder), or
//      `data-i18n-html="key"` (innerHTML, only for the couple of spots that
//      need embedded markup) — applyTranslations() fills these in.
//   2. Dynamic strings built in JS (status messages, etc.): call t('key', {vars})
//      directly instead of hardcoding text, same dictionary either way.
//
// Language choice persists in localStorage so it survives a reload.

const STORAGE_KEY = 'cda-lang';

const dict = {
  'zh-Hant': {
    'app.title': '⚡ AI-Driven Hardware Doctor',
    'lang.toggle': 'EN',
    'tool.easyeda': 'EasyEDA',
    'tool.kicad': 'KiCad',
    'tool.kicadReserved': 'KiCad 支援尚未實作,敬請期待',

    'status.notLoaded': '尚未載入 netlist',
    'status.parseFailed': '解析失敗:抓不到任何元件或net,確認匯出格式是 Protel(不是 PADS 或其他格式)',
    'status.loaded': '已載入:{compCount} 元件 / {netCnt} nets',

    'netlist.title': '1. 匯入 Netlist',
    'netlist.hint': 'EasyEDA: File → Export → Netlist,格式選 Protel(這個工具目前只支援 Protel 格式,不支援 PADS)',
    'netlist.fileLoaded': '已載入檔案:{name}',
    'netlist.emptyContent': 'netlist 內容是空的',

    'svg.title': '2. 上傳原始 SVG(選用)',
    'svg.hint': 'EasyEDA: File → Export → SVG。上傳後可看到跟你實際畫面一樣的版面,並且精準定位元件。可一次選取多個 SVG 檔(例如多張分頁),會依選取順序合併成同一個可捲動的畫面。',
    'svg.reading': '讀取中:{count} 個檔案...',
    'svg.parseFailed': '無法解析這些檔案,確認是否為有效的 SVG',
    'svg.matched': '成功定位 {count} 個元件 {note}',
    'svg.multiFileNote': '({files} 個檔案,共 {pages} 頁)',

    'bom3d.title': '3. 上傳 3D 預覽(選用)',
    'bom3d.hint': 'EasyEDA Pro: PCB → Export → Interactive BOM。這是 EasyEDA 自己的 3D 引擎,直接嵌入分頁顯示。',
    'bom3d.refmapHint': '元件對照表(一行一筆,格式:REF: top-default-N)。這份表要靠你點擊BOM清單、看Console裡的 setModelChecked log 手動整理,沒有自動生成的方法。',
    'bom3d.refmapPlaceholder': 'PMOS: top-default-3\nNMOS: top-default-18',
    'bom3d.applyBtn': '套用對照表',
    'bom3d.autoBtn': '自動建立對照表(實驗性)',
    'bom3d.reading': '讀取中:{name}...',
    'bom3d.loaded': '已載入:{name} — ',
    'bom3d.restoreLink': '還原完整畫面(含BOM清單)',
    'bom3d.openLink': '在新分頁開啟',
    'bom3d.applied': '已套用 {count} 筆對照(累計 {total} 筆)',
    'bom3d.needNetlistFirst': '請先解析 netlist,才知道要找哪些元件編號',
    'bom3d.autoStart': '開始逐一模擬點擊...',
    'bom3d.autoDone': '完成 — 自動對應了 {found}/{candidate} 個元件(累計 {total} 筆,結果已填入上面文字框,可以自己核對/修改)',
    'bom3d.err3dNotReady': '3D 還沒載入完成,或抓不到內部介面,先確認 3D 分頁已經顯示出來再試',
    'bom3d.errNoCandidates': '在 3D 畫面裡找不到任何跟元件編號完全相符的文字,可能BOM清單目前是隱藏的 — 先點「還原完整畫面」再試一次',

    'comp.title': '元件',
    'net.title': 'Net',
    'net.pinsCount': '{count} pins',

    'tabs.auto': '自動電路圖',
    'tabs.svg': '原始 SVG(需先上傳)',
    'tabs.3d': '3D 預覽(需先上傳)',

    'meas.title': '量測值(手動輸入,之後可接 BLE 電表)',
    'meas.netPlaceholder': 'net 名稱,例如 +48V',
    'meas.valPlaceholder': '電壓 V',

    'chat.title': 'AI Debug 對話',
    'chat.apiKeyHint': 'API key 由後端伺服器保管,不需要在這裡輸入。如果遇到錯誤，請嘗試確保 Model 名稱為 gemini-3-flash-preview。',
    'chat.initialHint': '解析 netlist 後即可提問,例如「R2 在哪裡」「+48V 電壓正常嗎」',
    'chat.netlistLoadedHint': 'netlist 已載入,可以開始提問',
    'chat.inputPlaceholder': '輸入問題,按 Enter 送出',
    'chat.sendBtn': '送出',
    'chat.needNetlistFirst': '請先解析 netlist',
    'chat.thinking': '思考中...',
    'chat.apiError': 'AI API 錯誤: {msg}',

    'common.readFailed': '檔案讀取失敗',
    'common.errorPrefix': '發生錯誤:{msg}',
  },
  en: {
    'app.title': '⚡ AI-Driven Hardware Doctor',
    'lang.toggle': '中文',
    'tool.easyeda': 'EasyEDA',
    'tool.kicad': 'KiCad',
    'tool.kicadReserved': 'KiCad support is not implemented yet, stay tuned',

    'status.notLoaded': 'No netlist loaded yet',
    'status.parseFailed': 'Parse failed: no components or nets found. Make sure the export format is Protel (not PADS or another format)',
    'status.loaded': 'Loaded: {compCount} components / {netCnt} nets',

    'netlist.title': '1. Import Netlist',
    'netlist.hint': 'EasyEDA: File → Export → Netlist, choose the Protel format (this tool currently only supports Protel, not PADS)',
    'netlist.fileLoaded': 'File loaded: {name}',
    'netlist.emptyContent': 'The netlist content is empty',

    'svg.title': '2. Upload original SVG (optional)',
    'svg.hint': 'EasyEDA: File → Export → SVG. Once uploaded you\'ll see a layout matching your real board, with precise component positions. You can select multiple SVG files at once (e.g. several pages) — they\'ll be merged, in selection order, into one scrollable view.',
    'svg.reading': 'Reading {count} file(s)...',
    'svg.parseFailed': 'Could not parse these files — make sure they are valid SVGs',
    'svg.matched': 'Successfully located {count} components {note}',
    'svg.multiFileNote': '({files} files, {pages} pages total)',

    'bom3d.title': '3. Upload 3D preview (optional)',
    'bom3d.hint': 'EasyEDA Pro: PCB → Export → Interactive BOM. This is EasyEDA\'s own 3D engine, embedded directly in a tab.',
    'bom3d.refmapHint': 'Component mapping table (one per line, format: REF: top-default-N). You have to build this table by hand — click through the BOM list and read the setModelChecked log in the Console; there\'s no automatic way to generate it.',
    'bom3d.refmapPlaceholder': 'PMOS: top-default-3\nNMOS: top-default-18',
    'bom3d.applyBtn': 'Apply mapping',
    'bom3d.autoBtn': 'Auto-build mapping (experimental)',
    'bom3d.reading': 'Reading: {name}...',
    'bom3d.loaded': 'Loaded: {name} — ',
    'bom3d.restoreLink': 'Restore full view (with BOM list)',
    'bom3d.openLink': 'Open in new tab',
    'bom3d.applied': 'Applied {count} mapping(s) (total {total})',
    'bom3d.needNetlistFirst': 'Parse a netlist first, so we know which component refs to look for',
    'bom3d.autoStart': 'Starting simulated clicks...',
    'bom3d.autoDone': 'Done — auto-mapped {found}/{candidate} components (total {total}). Results have been filled into the text box above; check/edit as needed',
    'bom3d.err3dNotReady': 'The 3D view isn\'t fully loaded yet, or its internal interface can\'t be reached. Make sure the 3D tab is showing first, then try again',
    'bom3d.errNoCandidates': 'No text in the 3D view exactly matches any component ref — the BOM list may currently be hidden. Click "Restore full view" first and try again',

    'comp.title': 'Components',
    'net.title': 'Net',
    'net.pinsCount': '{count} pins',

    'tabs.auto': 'Auto schematic',
    'tabs.svg': 'Original SVG (upload first)',
    'tabs.3d': '3D preview (upload first)',

    'meas.title': 'Measurements (manual entry for now, BLE meter later)',
    'meas.netPlaceholder': 'Net name, e.g. +48V',
    'meas.valPlaceholder': 'Voltage V',

    'chat.title': 'AI Debug Chat',
    'chat.apiKeyHint': 'The API key is kept on the backend server — no need to enter it here. If you hit an error, make sure the model name is gemini-3-flash-preview.',
    'chat.initialHint': 'Once the netlist is parsed you can ask questions, e.g. "Where is R2" or "Is +48V normal"',
    'chat.netlistLoadedHint': 'Netlist loaded — you can start asking questions',
    'chat.inputPlaceholder': 'Type a question, press Enter to send',
    'chat.sendBtn': 'Send',
    'chat.needNetlistFirst': 'Please parse a netlist first',
    'chat.thinking': 'Thinking...',
    'chat.apiError': 'AI API error: {msg}',

    'common.readFailed': 'Failed to read file',
    'common.errorPrefix': 'Error: {msg}',
  },
};

let currentLang = dict[localStorage.getItem(STORAGE_KEY)] ? localStorage.getItem(STORAGE_KEY) : 'zh-Hant';

export function getLang() {
  return currentLang;
}

export function t(key, vars) {
  let str = (dict[currentLang] && dict[currentLang][key]) ?? dict['zh-Hant'][key] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.split(`{${k}}`).join(String(v));
    });
  }
  return str;
}

/** Fills in every element carrying a data-i18n* attribute with the current language's text. */
export function applyTranslations() {
  document.documentElement.lang = currentLang === 'en' ? 'en' : 'zh-Hant';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) langBtn.textContent = t('lang.toggle');
}

export function setLang(lang) {
  if (!dict[lang] || lang === currentLang) return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations();
}

export function toggleLang() {
  setLang(currentLang === 'zh-Hant' ? 'en' : 'zh-Hant');
}
