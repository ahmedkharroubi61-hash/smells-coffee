export default function GlobalStyles() {
  return (
    <style>{`
      /* Fonts (Fraunces + Jost) are self-hosted — see src/fonts.css, imported
         from main.jsx. No external @import to Google's CDN: faster, works on
         blocked/offline networks, and no visitor IPs sent to Google. */

      .sb-root {
        --navy: #182B55;
        --navy-deep: #0E1B3B;
        --cream: #F6F1E7;
        --white-warm: #FDFBF5;
        --brass: #B08D57;
        --brass-light: #D9C39B;
        --brass-pill-bg: #F0E6D2;
        --ink: #14213F;
        --tri-green: #009246;
        --tri-white: #F4F5F0;
        --tri-red: #CE2B37;
        --serif: 'Fraunces', Georgia, serif;
        --sans: 'Jost', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        --radius-md: 10px;
        --max-width: 1320px;

        font-family: var(--sans);
        color: var(--ink);
        background: var(--cream);
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
        overflow-x: hidden;
      }
      .sb-root *, .sb-root *::before, .sb-root *::after { box-sizing: border-box; }
      :where(.sb-root) img { max-width: 100%; display: block; }
      :where(.sb-root) button { font-family: inherit; cursor: pointer; background: none; border: none; }
      :where(.sb-root) a { color: inherit; }
      :where(.sb-root) ul, :where(.sb-root) dl { margin: 0; padding: 0; }

      .sb-root :focus-visible { outline: 2px solid var(--brass); outline-offset: 3px; }

      .sb-skip-link {
        position: absolute; left: -9999px; top: 0; z-index: 1000;
        background: var(--white-warm); color: var(--navy); padding: 12px 20px;
        font-family: var(--sans); font-weight: 500; text-decoration: none;
      }
      .sb-skip-link:focus { left: 0; }

      .sb-tricolor-thread {
        height: 3px; width: 100%;
        background: linear-gradient(90deg, var(--tri-green) 0 33.33%, var(--tri-white) 33.33% 66.66%, var(--tri-red) 66.66% 100%);
      }
      .sb-tricolor-dash {
        display: inline-block; width: 22px; height: 3px; border-radius: 2px;
        background: linear-gradient(90deg, var(--tri-green) 0 33%, var(--tri-white) 33% 66%, var(--tri-red) 66% 100%);
      }

      .sb-eyebrow {
        display: inline-flex; align-items: center; gap: 8px;
        font-size: .75rem; letter-spacing: .14em; text-transform: uppercase;
        color: var(--brass); font-weight: 500; margin-bottom: 14px;
      }
      .sb-section-title {
        font-family: var(--serif); font-weight: 600; font-size: clamp(1.9rem, 4vw, 2.75rem);
        color: var(--navy); margin: 0 0 10px; line-height: 1.1;
      }
      .sb-section-title--light { color: var(--white-warm); }
      .sb-section-subtitle {
        font-weight: 300; font-size: 1.05rem; color: rgba(20,33,63,.65); max-width: 46ch;
        margin: 0 auto;
      }
      .sb-section-subtitle--light { color: rgba(253,251,245,.7); }

      .sb-reveal { opacity: 0; transform: translateY(26px); transition: opacity .7s ease, transform .7s ease; }
      .sb-reveal--visible { opacity: 1; transform: none; }

      /* ---------- Order toast ---------- */
      .sb-toast {
        position: fixed; top: 90px; left: 50%; z-index: 250;
        transform: translateX(-50%) translateY(-10px);
        display: flex; align-items: center; gap: 12px; max-width: calc(100vw - 32px);
        background: var(--navy); color: var(--white-warm); border-radius: 12px;
        padding: 12px 10px 12px 18px; box-shadow: 0 16px 40px rgba(14,27,59,.35);
        animation: sb-toast-in .35s ease forwards;
      }
      @keyframes sb-toast-in { to { transform: translateX(-50%) translateY(0); } }
      .sb-toast__text { font-size: .85rem; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .sb-toast__cta {
        flex-shrink: 0; font-size: .7rem; letter-spacing: .05em; text-transform: uppercase; font-weight: 600;
        color: var(--brass-light); border: 1px solid rgba(217,195,155,.4); border-radius: 999px; padding: 7px 13px;
        transition: background-color .2s ease;
      }
      .sb-toast__cta:hover { background: rgba(217,195,155,.12); }
      .sb-toast__close { flex-shrink: 0; color: rgba(253,251,245,.5); display: flex; padding: 4px; }
      .sb-toast__close:hover { color: var(--white-warm); }

      /* ---------- Intro overlay ---------- */
      .sb-intro {
        position: fixed; inset: 0; z-index: 300; cursor: pointer;
        display: flex; align-items: center; justify-content: center; overflow: hidden;
        background: linear-gradient(165deg, var(--navy) 0%, var(--navy-deep) 100%);
        transition: opacity .7s ease, visibility .7s;
      }
      .sb-intro--exiting { opacity: 0; visibility: hidden; pointer-events: none; }
      .sb-intro__steam { position: absolute; width: 340px; height: 340px; color: rgba(255,255,255,.09); pointer-events: none; }
      .sb-intro__steam path { stroke-dasharray: 420; stroke-dashoffset: 420; animation: sb-intro-draw 1.6s ease forwards; }
      .sb-intro__steam path:nth-child(2) { animation-delay: .12s; }
      .sb-intro__steam path:nth-child(3) { animation-delay: .24s; }
      @keyframes sb-intro-draw { to { stroke-dashoffset: 0; } }
      .sb-intro__content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; text-align: center; }
      .sb-intro__logo {
        width: 130px; height: 130px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,.35);
        opacity: 0; transform: scale(.86); animation: sb-intro-logo-in .9s cubic-bezier(.16,1,.3,1) .1s forwards;
      }
      @keyframes sb-intro-logo-in { to { opacity: 1; transform: scale(1); } }
      .sb-intro__thread {
        display: block; width: 0; height: 1px; background: var(--brass-light); margin: 22px 0 18px; overflow: hidden;
        animation: sb-intro-thread-in .7s ease .75s forwards;
      }
      @keyframes sb-intro-thread-in { to { width: 64px; } }
      .sb-intro__tagline {
        font-family: var(--serif); font-style: italic; font-weight: 500; color: var(--white-warm);
        font-size: 1rem; letter-spacing: .02em; margin: 0; opacity: 0;
        animation: sb-intro-tagline-in .8s ease 1s forwards;
      }
      @keyframes sb-intro-tagline-in { to { opacity: .85; } }
      .sb-intro__skip {
        position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
        font-size: .68rem; letter-spacing: .08em; text-transform: uppercase; color: rgba(253,251,245,.35);
        opacity: 0; animation: sb-intro-tagline-in .8s ease 1.6s forwards;
      }

      .sb-btn {
        display: inline-flex; align-items: center; gap: 8px; justify-content: center;
        font-size: .85rem; letter-spacing: .08em; text-transform: uppercase; font-weight: 500;
        padding: 15px 30px; border-radius: 2px; text-decoration: none; border: 1px solid transparent;
        transition: transform .25s ease, background-color .25s ease, border-color .25s ease, opacity .2s ease;
      }
      .sb-btn--primary { background: var(--white-warm); color: var(--navy); }
      .sb-btn--primary:hover { background: var(--brass-light); transform: translateY(-2px); }
      .sb-btn--secondary { background: transparent; border-color: rgba(253,251,245,.5); color: var(--white-warm); }
      .sb-btn--secondary:hover { border-color: var(--white-warm); background: rgba(253,251,245,.08); transform: translateY(-2px); }
      .sb-btn--full { width: 100%; }
      .sb-btn--outline-navy { background: transparent; border-color: var(--navy); color: var(--navy); }
      .sb-btn--outline-navy:hover { background: var(--navy); color: var(--white-warm); transform: translateY(-2px); }
      .sb-btn:disabled { opacity: .4; cursor: not-allowed; transform: none !important; }
      .sb-btn-ghost {
        display: block; width: 100%; background: none; border: none; color: rgba(20,33,63,.6);
        font-size: .8rem; letter-spacing: .05em; text-transform: uppercase; font-weight: 500;
        padding: 12px; text-align: center; transition: color .2s ease;
      }
      .sb-btn-ghost:hover { color: var(--navy); }

      /* ---------- Header ---------- */
      .sb-header {
        position: sticky; top: 0; z-index: 100;
        background: rgba(14,27,59,.95); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
        box-shadow: 0 4px 18px rgba(14,27,59,.2);
        transition: box-shadow .4s ease;
      }
      .sb-header--scrolled { box-shadow: 0 8px 24px rgba(14,27,59,.3); }
      .sb-header__inner {
        max-width: var(--max-width); margin: 0 auto; padding: 18px 24px;
        display: flex; align-items: center; justify-content: space-between;
        transition: padding .3s ease;
      }
      .sb-header--scrolled .sb-header__inner { padding: 12px 24px; }
      .sb-header__mark img { width: 44px; height: 44px; border-radius: 8px; }

      .sb-nav { display: none; gap: 30px; align-items: center; }
      @media (min-width: 880px) { .sb-nav { display: flex; } }
      .sb-nav__link {
        color: var(--white-warm); font-size: .85rem; letter-spacing: .06em; text-transform: uppercase;
        font-weight: 400; padding: 6px 1px; position: relative; opacity: .82; transition: opacity .25s ease;
        text-shadow: 0 1px 5px rgba(14,27,59,.55);
      }
      .sb-nav__link:hover { opacity: 1; }
      .sb-nav__link::after {
        content: ""; position: absolute; left: 0; right: 0; bottom: -3px; height: 2px; background: var(--brass);
        transform: scaleX(0); transform-origin: left; transition: transform .3s ease;
      }
      .sb-nav__link--active { opacity: 1; }
      .sb-nav__link--active::after { transform: scaleX(1); }

      .sb-header__right { display: flex; align-items: center; gap: 14px; }

      .sb-conto-btn {
        display: none; align-items: center; gap: 8px; position: relative;
        padding: 10px 18px; border-radius: 999px; border: 1px solid rgba(253,251,245,.35);
        color: var(--white-warm); font-size: .78rem; letter-spacing: .05em; text-transform: uppercase; font-weight: 500;
        transition: border-color .25s ease, background-color .25s ease;
        text-shadow: 0 1px 5px rgba(14,27,59,.55);
      }
      .sb-conto-btn:hover { border-color: var(--brass-light); background: rgba(253,251,245,.06); }
      @media (min-width: 880px) { .sb-conto-btn { display: inline-flex; } }
      .sb-conto-btn__badge {
        display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px;
        border-radius: 999px; background: var(--brass); color: var(--navy-deep); font-size: .68rem; font-weight: 700;
      }

      .sb-hamburger {
        color: var(--white-warm); display: flex; padding: 6px;
        filter: drop-shadow(0 1px 4px rgba(14,27,59,.55));
      }
      @media (min-width: 880px) { .sb-hamburger { display: none; } }

      .sb-mobile-menu {
        position: fixed; inset: 0; height: 100vh; height: 100dvh;
        background: var(--navy-deep); z-index: 99;
        display: flex; justify-content: center;
        overflow-y: auto; overscroll-behavior: contain; padding: 90px 24px 32px;
        transform: translateY(-100%); opacity: 0; visibility: hidden;
        transition: transform .4s ease, opacity .4s ease, visibility .4s;
      }
      .sb-mobile-menu--open { transform: translateY(0); opacity: 1; visibility: visible; }
      .sb-mobile-menu nav { display: flex; flex-direction: column; align-items: center; gap: 24px; margin: auto 0; }
      .sb-mobile-menu__link { font-family: var(--serif); font-size: 1.9rem; font-weight: 500; color: var(--white-warm); }
      @media (max-height: 600px) {
        .sb-mobile-menu nav { gap: 16px; }
        .sb-mobile-menu__link { font-size: 1.5rem; }
      }

      /* ---------- Hero ---------- */
      .sb-hero {
        position: relative; overflow: hidden;
        background: linear-gradient(165deg, var(--navy) 0%, var(--navy-deep) 100%);
        min-height: 92vh; display: flex; align-items: center; justify-content: center;
        padding: 90px 24px 70px; text-align: center;
      }
      .sb-hero__texture {
        position: absolute; inset: 0; pointer-events: none;
        background-image: radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px);
        background-size: 22px 22px; opacity: .5;
      }
      .sb-hero__glow {
        position: absolute; top: 6%; left: 50%; transform: translateX(-50%); pointer-events: none;
        width: 520px; height: 520px; border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,.09) 0%, rgba(255,255,255,0) 70%);
      }
      .sb-hero__steam { position: absolute; width: 280px; height: 280px; color: rgba(255,255,255,.07); pointer-events: none; }
      .sb-hero__steam--left { top: -20px; left: -60px; }
      .sb-hero__steam--right { bottom: -40px; right: -60px; transform: scaleX(-1); }
      @media (min-width: 700px) { .sb-hero__steam { width: 380px; height: 380px; } }

      .sb-hero__content { position: relative; z-index: 2; max-width: 640px; display: flex; flex-direction: column; align-items: center; }
      .sb-hero__logo {
        width: 150px; height: 150px; border-radius: 22px; margin-bottom: 30px;
        box-shadow: 0 20px 60px rgba(0,0,0,.35); transition: transform .5s ease;
      }
      .sb-hero__logo:hover { transform: scale(1.04); }
      @media (min-width: 700px) { .sb-hero__logo { width: 190px; height: 190px; } }
      .sb-hero__title {
        font-family: var(--serif); font-style: italic; font-weight: 500; color: var(--white-warm);
        font-size: clamp(1.7rem, 5vw, 2.8rem); line-height: 1.25; margin: 0 0 16px;
      }
      .sb-hero__subtitle {
        font-weight: 300; color: rgba(253,251,245,.78); font-size: 1.05rem; max-width: 44ch; margin: 0 0 34px;
      }
      .sb-hero__actions { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; }
      .sb-hero__scroll-cue {
        position: absolute; bottom: 26px; left: 50%; transform: translateX(-50%);
        width: 1px; height: 40px; background: linear-gradient(180deg, rgba(255,255,255,.6), transparent);
        animation: sb-cue 2.2s ease-in-out infinite;
      }
      @keyframes sb-cue { 0%,100% { opacity: .2; transform: translate(-50%,0); } 50% { opacity: 1; transform: translate(-50%,8px); } }

      /* ---------- Menu ---------- */
      .sb-menu { max-width: var(--max-width); margin: 0 auto; padding: 90px 24px 130px; }
      @media (min-width: 880px) { .sb-menu { padding-bottom: 90px; } }
      .sb-menu__intro { text-align: center; max-width: 640px; margin: 0 auto 42px; }

      .sb-tabs { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 44px; scrollbar-width: none; }
      .sb-tabs::-webkit-scrollbar { display: none; }
      @media (min-width: 760px) { .sb-tabs { justify-content: center; flex-wrap: wrap; overflow: visible; } }
      .sb-tab {
        flex: 0 0 auto; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
        padding: 11px 20px; border-radius: 999px; border: 1px solid rgba(24,43,85,.22);
        background: var(--white-warm); color: var(--navy); font-size: .82rem; letter-spacing: .05em;
        text-transform: uppercase; font-weight: 500; transition: background-color .25s ease, color .25s ease, border-color .25s ease;
      }
      .sb-tab:hover { border-color: var(--brass); }
      .sb-tab--active { background: var(--navy); color: var(--white-warm); border-color: var(--navy); }

      .sb-menu__grid { display: grid; grid-template-columns: 1fr; gap: 18px; }
      @media (min-width: 760px) { .sb-menu__grid { grid-template-columns: 1fr 1fr; column-gap: 32px; row-gap: 20px; } }

      .sb-menu-card {
        position: relative;
        border: 1px solid rgba(24,43,85,.14); background: var(--white-warm); border-radius: var(--radius-md);
        padding: 22px 24px; animation: sb-card-in .55s ease both; cursor: pointer;
        transition: border-color .3s ease, transform .3s ease, box-shadow .3s ease;
      }
      .sb-menu-card:hover { border-color: var(--brass); transform: translateY(-3px); box-shadow: 0 14px 30px rgba(24,43,85,.08); }
      /* Out of stock: stays fully on the menu, just flagged in red — not hidden. */
      .sb-menu-card--unavailable { opacity: .9; border-color: rgba(220,38,38,.4); box-shadow: inset 4px 0 0 #dc2626; }
      .sb-menu-card__rupture {
        position: absolute; top: 12px; right: 12px; z-index: 3;
        background: #dc2626; color: #fff; font-size: .62rem; font-weight: 700;
        letter-spacing: .07em; text-transform: uppercase; padding: 3px 10px; border-radius: 20px;
        box-shadow: 0 3px 10px rgba(220,38,38,.35);
      }
      @keyframes sb-card-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }

      .sb-menu-card__row { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
      .sb-menu-card__name {
        font-family: var(--serif); font-weight: 600; font-size: 1.15rem; color: var(--navy); margin: 0;
        display: inline-flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; flex: 1 1 auto; min-width: 130px;
      }
      .sb-menu-card__leader { flex: 1 1 24px; border-bottom: 1px dotted rgba(24,43,85,.3); position: relative; top: -4px; min-width: 12px; }
      .sb-menu-card__price { font-family: var(--serif); font-weight: 600; color: var(--navy); font-size: 1.05rem; flex: 0 0 auto; }
      .sb-menu-card__desc { font-weight: 300; font-style: italic; color: rgba(20,33,63,.68); font-size: .92rem; margin: 10px 0 0; line-height: 1.5; }

      .sb-badge {
        font-style: normal; font-size: .6rem; letter-spacing: .08em; text-transform: uppercase; font-weight: 600;
        color: var(--navy); background: var(--brass-pill-bg); border: 1px solid var(--brass); padding: 3px 8px; border-radius: 999px;
      }

      .sb-menu-card__action { margin-top: 16px; display: flex; }
      .sb-menu-card__sizes { display: flex; flex-direction: column; gap: 10px; margin-top: 14px; }
      .sb-menu-card__size-row { display: flex; align-items: center; gap: 10px; }
      .sb-menu-card__size-label { font-family: var(--sans); font-weight: 600; font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; color: var(--navy); opacity: .8; min-width: 46px; }
      .sb-menu-card__size-action { flex: 0 0 auto; }
      .sb-unavailable { font-size: .78rem; letter-spacing: .03em; color: rgba(20,33,63,.5); font-style: italic; }

      .sb-add-btn {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 9px 18px; border-radius: 999px; border: 1px solid var(--navy);
        color: var(--navy); font-size: .74rem; letter-spacing: .06em; text-transform: uppercase; font-weight: 500;
        transition: background-color .25s ease, color .25s ease;
      }
      .sb-add-btn:hover { background: var(--navy); color: var(--white-warm); }

      .sb-qty-stepper { display: inline-flex; align-items: center; gap: 2px; border: 1px solid rgba(24,43,85,.25); border-radius: 999px; overflow: hidden; }
      .sb-qty-stepper button {
        width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
        color: var(--navy); font-size: 1.1rem; font-weight: 500; transition: background-color .2s ease;
      }
      .sb-qty-stepper button:hover { background: rgba(24,43,85,.08); }
      .sb-qty-stepper span { min-width: 24px; text-align: center; font-family: var(--serif); font-weight: 600; color: var(--navy); }

      /* ---------- Gallery ---------- */
      .sb-gallery { position: relative; overflow: hidden; background: var(--navy-deep); padding: 90px 24px; }
      .sb-gallery__steam { position: absolute; top: -50px; left: -90px; width: 320px; height: 320px; color: rgba(255,255,255,.045); pointer-events: none; }
      .sb-gallery__intro { position: relative; z-index: 1; text-align: center; max-width: 640px; margin: 0 auto 44px; }
      .sb-gallery__grid {
        position: relative; z-index: 1; max-width: var(--max-width); margin: 0 auto;
        display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;
      }
      .sb-gallery__item {
        margin: 0; border-radius: 14px; overflow: hidden; position: relative;
        border: 1px solid rgba(253,251,245,.12); aspect-ratio: 1 / 1;
      }
      .sb-gallery__item img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .6s ease; }
      .sb-gallery__item:hover img { transform: scale(1.06); }
      @media (min-width: 640px) {
        .sb-gallery__grid { grid-template-columns: repeat(3, 1fr); grid-auto-rows: 170px; }
        .sb-gallery__item { aspect-ratio: auto; grid-row: span 1; }
        .sb-gallery__item--tall { grid-row: span 2; }
      }
      @media (min-width: 1024px) { .sb-gallery__grid { grid-auto-rows: 200px; } }

      /* ---------- Reviews ---------- */
      .sb-reviews { padding: 90px 0; }
      .sb-reviews__intro { text-align: center; max-width: 640px; margin: 0 auto 44px; padding: 0 24px; }
      .sb-reviews__marquee {
        overflow: hidden; margin-bottom: 40px;
        -webkit-mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
        mask-image: linear-gradient(90deg, transparent, black 6%, black 94%, transparent);
      }
      .sb-reviews__track { display: flex; gap: 20px; width: max-content; animation: sb-marquee 34s linear infinite; }
      .sb-reviews__marquee:hover .sb-reviews__track,
      .sb-reviews__marquee:focus-within .sb-reviews__track { animation-play-state: paused; }
      @keyframes sb-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      .sb-review-card {
        flex: 0 0 300px; margin: 0; border: 1px solid rgba(24,43,85,.14); background: var(--white-warm);
        border-radius: var(--radius-md); padding: 24px;
      }
      .sb-review-card__top { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
      .sb-review-card__avatar {
        flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center;
        justify-content: center; background: var(--navy); color: var(--white-warm); overflow: hidden;
        font-family: var(--serif); font-weight: 600; font-size: 1rem; text-transform: uppercase;
      }
      .sb-review-card__avatar img { width: 100%; height: 100%; object-fit: cover; }
      .sb-review-card__author { font-family: var(--serif); font-weight: 600; color: var(--navy); font-size: .9rem; margin: 0 0 1px; }
      .sb-review-card__meta { font-size: .7rem; color: rgba(20,33,63,.45); margin-bottom: 2px; }
      .sb-review-card__stars { color: var(--brass); font-size: .7rem; letter-spacing: .1em; }
      .sb-review-card__text { margin: 0; font-style: italic; font-weight: 300; color: rgba(20,33,63,.75); font-size: .92rem; line-height: 1.6; }
      .sb-reviews__cta { text-align: center; padding: 0 24px; }

      /* ---------- About ---------- */
      .sb-about {
        position: relative; overflow: hidden; background: var(--navy-deep); padding: 100px 24px;
        text-align: center; display: flex; flex-direction: column; align-items: center;
      }
      .sb-about__steam { position: absolute; top: -60px; right: -80px; width: 340px; height: 340px; color: rgba(255,255,255,.045); pointer-events: none; }
      .sb-about__photo { margin-bottom: 32px; position: relative; z-index: 1; }
      .sb-about__photo img {
        width: 100%; max-width: 420px; aspect-ratio: 4 / 3; object-fit: cover;
        border-radius: 16px; border: 1px solid rgba(253,251,245,.15);
        box-shadow: 0 24px 60px rgba(0,0,0,.35); transition: transform .5s ease;
      }
      .sb-about__photo img:hover { transform: scale(1.02); }
      .sb-about__text { max-width: 600px; position: relative; z-index: 1; }
      .sb-about__body { font-weight: 300; color: rgba(253,251,245,.8); font-size: 1.05rem; line-height: 1.8; }

      /* ---------- Contact ---------- */
      .sb-contact { background: var(--navy); padding: 100px 24px; }
      .sb-contact__intro { max-width: var(--max-width); margin: 0 auto; text-align: center; }
      .sb-contact__grid { max-width: 760px; margin: 40px auto 44px; display: grid; grid-template-columns: 1fr; gap: 36px; }
      @media (min-width: 640px) { .sb-contact__grid { grid-template-columns: 1fr 1fr; } }
      .sb-contact__list { list-style: none; display: flex; flex-direction: column; gap: 16px; }
      .sb-contact__list li { display: flex; align-items: flex-start; gap: 12px; color: rgba(253,251,245,.9); font-weight: 300; }
      .sb-contact__list svg { flex-shrink: 0; margin-top: 2px; color: var(--brass-light); }

      .sb-contact__hours-title {
        display: flex; align-items: center; gap: 8px; font-size: .8rem; letter-spacing: .1em; text-transform: uppercase;
        color: var(--brass-light); font-weight: 500; margin: 0 0 14px;
      }
      .sb-contact__hours-row {
        display: flex; justify-content: space-between; gap: 16px; padding: 8px 0;
        border-bottom: 1px solid rgba(253,251,245,.12); color: var(--white-warm); font-weight: 300; font-size: .92rem;
      }
      .sb-contact__hours-row dt { color: rgba(253,251,245,.65); }
      .sb-contact__hours-row dd { margin: 0; font-family: var(--serif); }

      .sb-contact__map {
        width: 100%; max-width: 340px; aspect-ratio: 1 / 1; margin: 0 auto 40px;
        border-radius: 16px; overflow: hidden; border: 1px solid rgba(253,251,245,.18);
        box-shadow: 0 20px 50px rgba(14,27,59,.35);
      }
      .sb-contact__map iframe { width: 100%; height: 100%; border: 0; display: block; }
      .sb-contact__actions { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; max-width: var(--max-width); margin: 0 auto; }

      /* ---------- Footer ---------- */
      .sb-footer { background: var(--navy-deep); }
      .sb-footer__inner { max-width: var(--max-width); margin: 0 auto; padding: 56px 24px 32px; text-align: center; display: flex; flex-direction: column; align-items: center; }
      .sb-footer__logo { width: 52px; height: 52px; margin-bottom: 18px; border-radius: 8px; transition: transform .5s ease; }
      .sb-footer__logo:hover { transform: scale(1.04); }
      .sb-footer__brand { font-family: var(--serif); font-weight: 600; font-size: 1.2rem; color: var(--white-warm); letter-spacing: .04em; margin: 0 0 6px; }
      .sb-footer__tagline { font-weight: 300; color: rgba(253,251,245,.6); font-size: .85rem; margin: 0 0 22px; }
      .sb-footer__social { display: flex; gap: 18px; margin-bottom: 26px; }
      .sb-footer__social a { color: var(--white-warm); opacity: .8; transition: opacity .25s ease, transform .25s ease; display: inline-flex; }
      .sb-footer__social a:hover { opacity: 1; transform: translateY(-2px); color: var(--brass-light); }
      .sb-footer__copyright { font-weight: 300; font-size: .75rem; color: rgba(253,251,245,.45); margin: 0; }
      .sb-footer__credit { font-weight: 300; font-size: .75rem; color: rgba(253,251,245,.45); margin: 6px 0 0; }
      .sb-footer__credit a { color: var(--brass-light); font-weight: 500; transition: color .2s ease; }
      .sb-footer__credit a:hover { color: var(--white-warm); }
      .sb-footer__admin-link { display: inline-block; margin-top: 14px; font-size: .68rem; letter-spacing: .05em; color: rgba(253,251,245,.28); transition: color .2s ease; }
      .sb-footer__admin-link:hover { color: rgba(253,251,245,.6); }

      /* ---------- Mobile bill bar ---------- */
      .sb-bill-bar {
        position: fixed; left: 12px; right: 12px; bottom: 12px; z-index: 90;
        display: flex; align-items: center; justify-content: space-between; gap: 14px;
        background: var(--navy); color: var(--white-warm); border-radius: 14px;
        padding: 14px 10px 14px 20px; padding-bottom: max(14px, env(safe-area-inset-bottom));
        box-shadow: 0 16px 40px rgba(14,27,59,.35);
        transform: translateY(140%); transition: transform .4s ease;
      }
      .sb-bill-bar--visible { transform: translateY(0); }
      @media (min-width: 880px) { .sb-bill-bar { display: none; } }
      .sb-bill-bar__summary { font-size: .78rem; letter-spacing: .04em; text-transform: uppercase; font-weight: 500; }
      .sb-bill-bar__cta {
        background: var(--white-warm); color: var(--navy); padding: 12px 26px; border-radius: 10px;
        font-size: .78rem; letter-spacing: .08em; text-transform: uppercase; font-weight: 600;
      }

      /* ---------- Payment panel ---------- */
      .sb-panel-overlay {
        position: fixed; inset: 0; z-index: 200; background: rgba(14,27,59,.55); backdrop-filter: blur(4px);
        display: flex; align-items: flex-end; justify-content: center; animation: sb-fade-in .25s ease;
      }
      @media (min-width: 700px) { .sb-panel-overlay { align-items: center; padding: 24px; } }
      .sb-panel {
        position: relative; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto;
        background: var(--cream); border-radius: 22px 22px 0 0;
        padding: 34px 26px max(28px, env(safe-area-inset-bottom));
        animation: sb-panel-up .4s ease;
      }
      @media (min-width: 700px) { .sb-panel { border-radius: 18px; max-height: 86vh; padding: 38px 34px; } }
      @keyframes sb-panel-up { from { transform: translateY(28px); opacity: 0; } to { transform: none; opacity: 1; } }
      @keyframes sb-fade-in { from { opacity: 0; } to { opacity: 1; } }
      .sb-panel__close {
        position: absolute; top: 18px; right: 18px; width: 36px; height: 36px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center; color: var(--navy);
        border: 1px solid rgba(24,43,85,.18); transition: background-color .2s ease;
      }
      .sb-panel__close:hover { background: rgba(24,43,85,.08); }
      .sb-panel__title { font-family: var(--serif); font-weight: 600; font-size: 1.6rem; color: var(--navy); margin: 0 0 18px; padding-right: 40px; }
      .sb-panel__empty { color: rgba(20,33,63,.6); font-weight: 300; padding: 20px 0 6px; }

      .sb-detail-panel__header { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
      .sb-detail-panel__name {
        font-family: var(--serif); font-weight: 600; font-size: 1.4rem; color: var(--navy); margin: 0;
        padding-right: 34px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
      }
      .sb-detail-panel__price { font-family: var(--serif); font-weight: 600; font-size: 1.3rem; color: var(--navy); flex-shrink: 0; }
      .sb-detail-panel__desc { font-weight: 300; font-style: italic; color: rgba(20,33,63,.65); font-size: .95rem; line-height: 1.6; margin: 16px 0 28px; }
      .sb-detail-panel__action { display: flex; }
      .sb-panel__actions { display: flex; flex-direction: column; gap: 12px; }

      .sb-conto-list { list-style: none; display: flex; flex-direction: column; gap: 16px; margin: 0 0 20px; }
      .sb-conto-list__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid rgba(24,43,85,.1); flex-wrap: wrap; }
      .sb-conto-list__info { display: flex; flex-direction: column; gap: 2px; min-width: 120px; }
      .sb-conto-list__name { font-family: var(--serif); font-weight: 600; color: var(--navy); }
      .sb-conto-list__unit { font-size: .75rem; color: rgba(20,33,63,.55); }
      .sb-conto-list__controls { display: flex; align-items: center; gap: 12px; }
      .sb-conto-list__subtotal { font-family: var(--serif); font-weight: 600; color: var(--navy); min-width: 56px; text-align: right; }
      .sb-conto-list__remove { color: rgba(20,33,63,.4); padding: 6px; transition: color .2s ease; display: inline-flex; }
      .sb-conto-list__remove:hover { color: var(--tri-red); }

      .sb-conto-total { display: flex; justify-content: space-between; align-items: baseline; padding: 16px 0; border-top: 2px solid var(--navy); font-family: var(--serif); font-weight: 600; font-size: 1.2rem; color: var(--navy); margin-bottom: 22px; }

      .sb-table-picker { margin-bottom: 26px; }
      .sb-table-picker__label { display: block; font-size: .78rem; letter-spacing: .08em; text-transform: uppercase; color: var(--brass); font-weight: 500; margin-bottom: 12px; }
      .sb-name-field { margin: 0 0 20px; }
      .sb-name-field label { display: block; font-size: .78rem; letter-spacing: .08em; text-transform: uppercase; color: var(--brass); font-weight: 500; margin-bottom: 10px; }
      .sb-table-picker__grid { display: flex; flex-wrap: wrap; gap: 8px; }
      .sb-table-chip {
        width: 42px; height: 42px; border-radius: 10px; border: 1px solid rgba(24,43,85,.22);
        background: var(--white-warm); color: var(--navy); font-family: var(--serif); font-weight: 600;
        transition: background-color .2s ease, color .2s ease, border-color .2s ease;
      }
      .sb-table-chip:hover { border-color: var(--brass); }
      .sb-table-chip--active { background: var(--navy); color: var(--white-warm); border-color: var(--navy); }

      .sb-panel__total-recap { display: flex; justify-content: space-between; align-items: baseline; padding: 16px 18px; background: rgba(24,43,85,.05); border-radius: 12px; margin-bottom: 24px; font-family: var(--serif); color: var(--navy); }
      .sb-panel__total-recap strong { font-size: 1.3rem; }

      .sb-method-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 22px; }
      .sb-method-btn {
        display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-radius: 12px;
        border: 1px solid rgba(24,43,85,.18); background: var(--white-warm); color: var(--navy);
        font-size: .95rem; font-weight: 500; transition: border-color .2s ease, transform .2s ease;
      }
      .sb-method-btn:hover { border-color: var(--brass); transform: translateY(-2px); }

      .sb-processing { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 60px 10px; text-align: center; color: var(--navy); font-weight: 300; }
      .sb-spinner { width: 40px; height: 40px; border-radius: 50%; border: 3px solid rgba(24,43,85,.15); border-top-color: var(--brass); animation: sb-spin .8s linear infinite; }
      @keyframes sb-spin { to { transform: rotate(360deg); } }

      .sb-result { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 10px 0 6px; }
      .sb-result .sb-panel__title { text-align: center; padding-right: 0; }
      .sb-result__icon {
        width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
        background: rgba(0,146,70,.12); color: var(--tri-green); margin-bottom: 18px;
      }
      .sb-result__icon--error { background: rgba(206,43,55,.12); color: var(--tri-red); }
      .sb-result__thanks { color: rgba(20,33,63,.65); font-weight: 300; margin: 0 0 24px; max-width: 34ch; }
      .sb-result__details { width: 100%; display: flex; flex-direction: column; gap: 10px; padding: 18px; background: rgba(24,43,85,.05); border-radius: 12px; margin-bottom: 24px; }
      .sb-result__details > div { display: flex; justify-content: space-between; font-size: .92rem; color: var(--navy); }
      .sb-result__details span { color: rgba(20,33,63,.55); }
      .sb-result__social { margin-bottom: 26px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
      .sb-result__social span { font-size: .78rem; letter-spacing: .06em; text-transform: uppercase; color: rgba(20,33,63,.5); }
      .sb-result__social-icons { display: flex; gap: 16px; }
      .sb-result__social-icons a { color: var(--navy); opacity: .75; transition: opacity .2s ease, color .2s ease; display: inline-flex; }
      .sb-result__social-icons a:hover { opacity: 1; color: var(--brass); }

      /* ---------- Admin panel ---------- */
      .sb-panel--wide { max-width: 600px; }
      .sb-admin-intro { color: rgba(20,33,63,.6); font-weight: 300; margin: 0 0 18px; }
      .sb-admin-input {
        width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid rgba(24,43,85,.22);
        background: var(--white-warm); color: var(--ink); font-family: var(--sans); font-size: .92rem;
        margin-top: 6px; transition: border-color .2s ease;
      }
      .sb-admin-input:focus { border-color: var(--brass); }
      .sb-admin-textarea { resize: vertical; min-height: 60px; }
      .sb-admin-error { color: var(--tri-red); font-size: .82rem; margin: 10px 0 0; }
      .sb-admin-rupture { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; border-radius: 10px; padding: 12px 14px; font-size: .88rem; margin: 0 0 18px; line-height: 1.5; }
      .sb-admin-rupture__hint { display: block; font-size: .76rem; color: rgba(20,33,63,.5); margin-top: 6px; }
      .sb-admin-add-btn { width: 100%; justify-content: center; margin-bottom: 24px; padding: 12px 18px; }
      .sb-admin-group { margin-bottom: 22px; }
      .sb-admin-group__title {
        font-family: var(--serif); font-weight: 600; font-size: .95rem; color: var(--navy);
        margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid rgba(24,43,85,.12);
      }
      .sb-admin-item-row {
        display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0;
        border-bottom: 1px solid rgba(24,43,85,.08);
      }
      .sb-admin-item-row__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .sb-admin-item-row__name { font-weight: 500; color: var(--ink); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .sb-admin-item-row__flag {
        font-size: .62rem; letter-spacing: .05em; text-transform: uppercase; color: var(--tri-red);
        border: 1px solid var(--tri-red); border-radius: 999px; padding: 2px 7px;
      }
      .sb-admin-item-row__price { font-size: .82rem; color: rgba(20,33,63,.55); }
      .sb-admin-item-row__actions { display: flex; gap: 4px; flex-shrink: 0; }
      .sb-admin-item-row__actions button {
        width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
        border-radius: 8px; color: rgba(20,33,63,.55); transition: background-color .2s ease, color .2s ease;
      }
      .sb-admin-item-row__actions button:hover { background: rgba(24,43,85,.08); color: var(--navy); }
      .sb-admin-field { display: block; font-size: .82rem; letter-spacing: .03em; color: rgba(20,33,63,.65); margin-bottom: 16px; }
      .sb-admin-checkbox { display: flex; align-items: center; gap: 10px; font-size: .88rem; color: var(--ink); margin-bottom: 22px; }
      .sb-admin-checkbox input { width: 18px; height: 18px; accent-color: var(--navy); }

      @media (prefers-reduced-motion: reduce) {
        .sb-root *, .sb-root *::before, .sb-root *::after {
          animation-duration: .01ms !important; animation-iteration-count: 1 !important;
          transition-duration: .01ms !important; scroll-behavior: auto !important;
        }
      }
    `}</style>
  );
}
