import Link from 'next/link'

export default function BootstrapAdminPage() {
  return (
    <div className="page">
      <section className="checkoutLayout">
        <form action="/api/admin-bootstrap" className="checkoutPanel" method="post">
          <div className="checkoutPanelHeader">
            <span className="eyebrow">Админка</span>
            <h1>Первичная настройка админки</h1>
          </div>

          <p className="formNote">
            Введите первичный токен из переменных окружения. После проверки откроется создание
            первого пользователя админки.
          </p>
          <p className="formNote">
            Если сайт открыт через localtunnel, админка находится на том же домене по пути
            <strong> /admin</strong>. Например: текущая ссылка + <strong>/admin</strong>.
          </p>

          <label className="checkoutField">
            <span>Первичный токен</span>
            <input
              autoComplete="one-time-code"
              name="token"
              required
              type="password"
            />
          </label>

          <button className="button" type="submit">
            Открыть создание пользователя
          </button>
          <Link className="buttonSecondary" href="/admin" prefetch={false}>
            Перейти в админку
          </Link>
        </form>
      </section>
    </div>
  )
}
