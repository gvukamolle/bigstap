import { extractText, getDocumentProxy } from 'unpdf'

// Достаём текстовый слой PDF. Если слоя нет (скан/картинка) или файл битый — возвращаем ''
// (вызывающий трактует это как «не распознано», заказ не блокируется).
export async function extractReceiptText(pdf: Buffer): Promise<string> {
  try {
    const doc = await getDocumentProxy(new Uint8Array(pdf))
    const { text } = await extractText(doc, { mergePages: true })
    // unpdf при mergePages:true возвращает text: string. Defensive-fallbacks убраны —
    // под типами unpdf 1.6 они недостижимы и роняют tsc.
    return typeof text === 'string' ? text : ''
  } catch {
    return ''
  }
}
