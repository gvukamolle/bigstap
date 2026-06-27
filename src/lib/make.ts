import type { MakeConfig } from './integrationCredentials'

const TIMEOUT_MS = 10_000

async function postOnce(config: MakeConfig, form: FormData): Promise<boolean> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const headers: Record<string, string> = {}
    if (config.webhookSecret) headers['X-Bigstep-Secret'] = config.webhookSecret
    const res = await fetch(config.webhookUrl, {
      method: 'POST',
      headers,
      body: form,
      signal: controller.signal
    })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

// Шлём заказ + PDF в Make одним multipart-запросом. Форматирование текста и доставку в Telegram
// делает сценарий Make. Best-effort: один ретрай, наружу — только { ok }.
export async function sendOrderToMake(
  config: MakeConfig,
  input: { payloadJson: string; pdf: Buffer; filename: string }
): Promise<{ ok: boolean }> {
  const buildForm = () => {
    const form = new FormData()
    form.set('payload', input.payloadJson)
    form.set('receipt', new Blob([new Uint8Array(input.pdf)], { type: 'application/pdf' }), input.filename)
    return form
  }

  if (await postOnce(config, buildForm())) return { ok: true }
  return { ok: await postOnce(config, buildForm()) }
}
