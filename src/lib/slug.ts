// Транслитерация кириллицы в URL-адрес товара. Используется для автогенерации
// поля slug из названия, чтобы владельцу не приходилось вводить адрес вручную.

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
}

/**
 * Превращает произвольное название в slug: латиница, цифры и одиночные дефисы
 * (kebab-case), без ведущих/замыкающих дефисов. Кириллица транслитерируется.
 * Возвращает пустую строку, если из названия не получилось ни одного символа.
 */
export function slugify(input: string): string {
  const lower = (input ?? '').toLowerCase()

  let transliterated = ''
  for (const char of lower) {
    transliterated += char in CYRILLIC_MAP ? CYRILLIC_MAP[char] : char
  }

  return transliterated
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
