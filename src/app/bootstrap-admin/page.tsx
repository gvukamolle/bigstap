export default function BootstrapAdminPage() {
  return (
    <div className="page">
      <section className="checkoutLayout">
        <form action="/api/admin-bootstrap" className="checkoutPanel" method="post">
          <div className="checkoutPanelHeader">
            <span className="eyebrow">Payload</span>
            <h1>Первичная настройка админки</h1>
          </div>

          <p className="formNote">
            Введите bootstrap-токен из переменных окружения. После проверки откроется создание
            первого пользователя Payload.
          </p>

          <label className="checkoutField">
            <span>Bootstrap-токен</span>
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
        </form>
      </section>
    </div>
  )
}
