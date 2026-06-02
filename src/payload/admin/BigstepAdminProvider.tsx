import type { ReactNode } from 'react'

const adminCss = `
  @font-face {
    font-family: 'Roboto Condensed';
    font-weight: 400;
    font-display: swap;
    src: url('/fonts/roboto-condensed-cyrillic-400-normal.woff2') format('woff2');
    unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
  }
  @font-face {
    font-family: 'Roboto Condensed';
    font-weight: 400;
    font-display: swap;
    src: url('/fonts/roboto-condensed-latin-400-normal.woff2') format('woff2');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
      U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212,
      U+2215, U+FEFF, U+FFFD;
  }
  @font-face {
    font-family: 'Roboto Condensed';
    font-weight: 700;
    font-display: swap;
    src: url('/fonts/roboto-condensed-cyrillic-700-normal.woff2') format('woff2');
    unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
  }
  @font-face {
    font-family: 'Roboto Condensed';
    font-weight: 700;
    font-display: swap;
    src: url('/fonts/roboto-condensed-latin-700-normal.woff2') format('woff2');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
      U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212,
      U+2215, U+FEFF, U+FFFD;
  }

  :root {
    --bigstep-admin-bg: #ffffff;
    --bigstep-admin-panel: #ffffff;
    --bigstep-admin-text: #000000;
    --bigstep-admin-muted: #525252;
    --bigstep-admin-line: #e5e5e5;
    --bigstep-admin-line-strong: #d4d4d4;
    --font-body: "Roboto Condensed", "Arial Narrow", Arial, sans-serif;
  }

  body,
  html {
    background: var(--bigstep-admin-bg);
    color: var(--bigstep-admin-text);
    font-family: "Roboto Condensed", "Arial Narrow", Arial, sans-serif;
  }

  .template-default__wrap,
  .app-header__bg,
  .gutter.dashboard,
  .template-default,
  .login.template-minimal,
  .login.template-minimal .template-minimal__wrap {
    background: var(--bigstep-admin-bg);
  }

  .nav,
  .nav__scroll,
  .nav__wrap,
  .nav__header {
    background: var(--bigstep-admin-bg);
    color: var(--bigstep-admin-text);
  }

  .nav {
    border-right: 1px solid var(--bigstep-admin-line);
  }

  .nav-group__label {
    color: var(--bigstep-admin-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .nav__link,
  .nav__log-out,
  .nav-group__toggle {
    color: var(--bigstep-admin-text);
  }

  .nav__link {
    border-radius: 0;
    font-weight: 650;
  }

  .nav__link:hover,
  .nav__link:focus-visible,
  .nav__link--active {
    background: rgba(0, 0, 0, 0.04);
    color: var(--bigstep-admin-text);
  }

  .nav .stroke {
    stroke: currentColor;
  }

  .nav__controls {
    border-top: 1px solid var(--bigstep-admin-line);
  }

  .app-header {
    border-bottom: 1px solid var(--bigstep-admin-line);
    background: var(--bigstep-admin-bg);
  }

  .step-nav__home {
    transform: translateY(1px);
  }

  .bigstepNavBrand {
    border-bottom: 1px solid var(--bigstep-admin-line);
    color: var(--bigstep-admin-text);
    display: grid;
    gap: 8px;
    margin: 0 0 16px;
    padding: 20px 22px 18px;
  }

  .bigstepNavBrandTitle {
    align-items: center;
    display: flex;
    font-size: 17px;
    gap: 10px;
    font-weight: 800;
    line-height: 1;
  }

  .bigstepNavBrandTitle img {
    display: block;
    height: 34px;
    object-fit: contain;
    width: 34px;
  }

  .bigstepNavBrandNote {
    color: var(--bigstep-admin-muted);
    font-size: 11px;
    font-weight: 700;
    line-height: 1.35;
    text-transform: uppercase;
  }

  .bigstepDashboardIntro {
    align-items: flex-end;
    border: 1px solid var(--bigstep-admin-line);
    display: flex;
    flex-wrap: wrap;
    gap: 16px 24px;
    justify-content: space-between;
    margin: 0 0 28px;
    padding: 22px 24px;
  }

  .bigstepDashboardIntroEyebrow {
    color: var(--bigstep-admin-muted);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0;
    margin: 0 0 8px;
    text-transform: uppercase;
  }

  .bigstepDashboardIntro h1 {
    color: var(--bigstep-admin-text);
    font-size: clamp(28px, 4vw, 40px);
    font-weight: 800;
    letter-spacing: 0;
    line-height: 1;
    margin: 0;
    text-transform: uppercase;
  }

  .bigstepDashboardIntroText {
    color: var(--bigstep-admin-muted);
    font-size: 14px;
    line-height: 1.45;
    margin: 10px 0 0;
    max-width: 520px;
  }

  .bigstepDashboardIntroLink {
    border: 1px solid var(--bigstep-admin-text);
    color: var(--bigstep-admin-text);
    display: inline-flex;
    font-size: 12px;
    font-weight: 700;
    min-height: 42px;
    padding: 12px 16px;
    text-decoration: none;
    text-transform: uppercase;
  }

  .bigstepDashboardIntroLink:hover,
  .bigstepDashboardIntroLink:focus-visible {
    background: var(--bigstep-admin-text);
    color: var(--bigstep-admin-bg);
    outline: none;
  }

  .card,
  .where-builder,
  .collection-list,
  .list-controls__wrap,
  .search-filter,
  .login.template-minimal .template-minimal__wrap form,
  .login .field-type input,
  .login .field-type textarea {
    border: 1px solid var(--bigstep-admin-line);
    background: var(--bigstep-admin-panel);
    border-radius: 0;
  }

  .card {
    transition:
      border-color 160ms ease,
      background-color 160ms ease;
  }

  .card:hover,
  .card:focus-within {
    border-color: var(--bigstep-admin-line-strong);
    background: var(--bigstep-admin-panel);
    color: var(--bigstep-admin-text);
    transform: none;
  }

  .card .card__click {
    border: none;
    background: transparent;
    box-shadow: none;
    outline: none;
  }

  .card:hover .card__click,
  .card:focus-within .card__click {
    border: none;
    outline: none;
  }

  .card:hover .card__actions .btn,
  .card:focus-within .card__actions .btn {
    border-color: var(--bigstep-admin-line-strong);
    color: var(--bigstep-admin-text);
  }

  .card__actions .btn:focus-visible {
    outline: none;
    box-shadow: none;
  }

  .collections__label,
  .doc-header h1,
  .collection-list__header h1,
  .dashboard h1,
  .login .field-label,
  .login h1 {
    color: var(--bigstep-admin-text);
    font-weight: 800;
    letter-spacing: 0;
  }

  .collections__label {
    font-size: 12px;
    text-transform: uppercase;
  }

  .field-label .required,
  .required {
    color: var(--bigstep-admin-text) !important;
  }

  .btn--style-primary,
  .form-submit .btn {
    border: 1px solid var(--bigstep-admin-text);
    background: var(--bigstep-admin-text);
    color: var(--bigstep-admin-bg);
    border-radius: 0;
  }

  .btn--style-primary:hover,
  .btn--style-primary:focus-visible,
  .form-submit .btn:hover,
  .form-submit .btn:focus-visible {
    background: var(--bigstep-admin-text);
    border-color: var(--bigstep-admin-text);
    opacity: 0.88;
  }

  .login__brand {
    display: flex;
    justify-content: center;
    margin-bottom: 28px;
  }

  .login .btn--style-primary {
    width: 100%;
  }
`

export default function BigstepAdminProvider({ children }: { children?: ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: adminCss }} />
      {children}
    </>
  )
}
