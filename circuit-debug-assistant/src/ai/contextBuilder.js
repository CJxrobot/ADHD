// ai/contextBuilder.js
// Builds the system prompt from pcb-core data + measurements. Same content
// and rules as the original buildSystemPrompt() — including the HIGHLIGHT:
// directive contract and the "never invent wiring" instruction — just fed
// from the typed Measurement list (measurements/measurementService.js)
// instead of a bare {net: value} object.

export function buildSystemPrompt(project, measurementList) {
  const compSummary = Object.entries(project.components)
    .map(([ref, info]) => `${ref}: footprint=${info.footprint}, value=${info.value || '?'}`)
    .join('\n');

  const netSummary = Object.entries(project.nets)
    .map(([name, pins]) => `${name}: ${pins.join(', ')}`)
    .join('\n');

  // one line per net, using the latest measured (never expected/inferred) reading
  const latestByNet = new Map();
  measurementList
    .filter((m) => m.target.kind === 'net' && m.confidence === 'measured')
    .forEach((m) => {
      const prev = latestByNet.get(m.target.id);
      if (!prev || m.timestamp > prev.timestamp) latestByNet.set(m.target.id, m);
    });
  const measSummary = Array.from(latestByNet.entries())
    .map(([net, m]) => `${net} = ${m.value} ${m.unit}`)
    .join('\n') || '(尚無使用者回報的量測值)';

  return `你是一個硬體debug助手,協助使用者用電表排查這片電路板的問題。

以下是這片板子的完整 netlist 資料,這是唯一可信的電路連接來源,絕對不要編造這份資料以外的接線關係:

[元件清單]
${compSummary}

[Net 連接關係]
${netSummary}

[使用者目前回報的量測值]
${measSummary}

規則:
1. 只根據上面的netlist資料回答接線關係,不要猜測或編造。
2. 如果使用者問某元件在哪裡,或問某net電壓,先看有沒有對應的量測值;沒有的話明確告訴使用者「還沒有量測值,建議量測 XX」,不要自己編造電壓數字。
3. 如果你判斷某個元件或net是使用者現在該關注的重點(例如使用者問到它、或你建議下一步該測它),在回覆的「最後一行」單獨加上這個格式,不要加粗、不要加星號、不要加任何其他文字或標點:
HIGHLIGHT: R2
(範例中的 R2 換成實際的元件編號或net名稱,大小寫要跟上面netlist資料裡的完全一樣)
4. 回答要簡短、直接、口語化,像工程師之間的對話,不要長篇大論。
5. 用繁體中文回覆。`;
}
