// Разбор embed-сообщений GMENTOR.
// Заголовок:  "Бросок IQ против 8" / "Бросок умения Stealth (Скрытность) против 13"
// Описание:   "⚄ ⚃ ⚁ = `8`\nУспех (-1)"
// Футер:      "Прочие модификаторы -3" (необязателен)

export function parseEmbed(e) {
  const title = (e.title || '').match(/^Бросок\s+(?:умения\s+)?(.+?)\s+против\s+(-?\d+)\s*$/i);
  if (!title) return null;

  const desc = e.description || '';
  const total = desc.match(/=\s*`?\s*(-?\d+)/);
  const res = desc.match(/(Критический\s+успех|Критический\s+провал|Успех|Провал)(?:\s*\(\s*([+-]?\d+)\s*\))?/i);
  if (!total || !res) return null;

  const label = res[1].replace(/\s+/g, ' ');
  const l = label.toLowerCase();
  const outcome = l.startsWith('критический')
    ? (l.includes('успех') ? 'crit-success' : 'crit-failure')
    : (l === 'успех' ? 'success' : 'failure');

  // Кубы-юникод ⚀–⚅ (U+2680–2685). Если GMENTOR шлёт кастомные эмодзи, массив будет пустым — это нормально.
  const dice = [...desc.matchAll(/[\u2680-\u2685]/g)].map(m => m[0].charCodeAt(0) - 0x267f);
  const mod = (e.footer?.text || '').match(/модификатор\S*\s*([+-]?\d+)/i);

  return {
    skill: title[1],
    target: Number(title[2]),
    total: Number(total[1]),
    dice,
    outcome,
    label,
    margin: res[2] != null ? Math.abs(Number(res[2])) : null,
    modifier: mod ? Number(mod[1]) : null,
  };
}
