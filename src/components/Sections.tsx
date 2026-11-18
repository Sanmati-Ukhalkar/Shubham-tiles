import { useEffect, useRef, useState } from 'react';
import { BLOCK, BRAND, COLOURS, THICKNESSES } from '../config';
import { drawSwatch } from '../geometry/render2d';
import { blockArea, Design } from '../geometry/trihex';
import { Key, useI18n } from '../i18n';
import { Logo, WhatsAppIcon } from './Icons';

export function Swatch({ design, across = 5, className }: { design: Design; across?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const w = c.clientWidth || 300;
    const h = c.clientHeight || 300;
    const dpr = Math.min(window.devicePixelRatio, 2);
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    drawSwatch(c, design, across);
  }, [design, across]);
  return <canvas ref={ref} className={className ?? 'swatch'} />;
}

export function waLink(text: string) {
  return `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}`;
}

export function Nav({ onDesign }: { onDesign: () => void }) {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => {
      const hero = document.getElementById('home');
      setSolid(hero ? hero.getBoundingClientRect().bottom < 80 : window.scrollY > 200);
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  const links: [Key, string][] = [
    ['nav_products', '#products'],
    ['nav_patterns', '#patterns'],
    ['nav_work', '#work'],
    ['nav_contact', '#contact'],
  ];
  return (
    <header className={`nav ${solid || open ? 'nav-solid' : ''}`}>
      <a href="#home" className="nav-logo" aria-label={BRAND.name}>
        <Logo />
      </a>
      <nav className={`nav-links ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        {links.map(([k, href]) => (
          <a key={k} href={href}>
            {t(k)}
          </a>
        ))}
        <button className="link-btn" onClick={onDesign}>
          {t('nav_design')}
        </button>
      </nav>
      <div className="nav-right">
        <div className="lang" role="group" aria-label="Language">
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
            EN
          </button>
          <button className={lang === 'mr' ? 'on' : ''} onClick={() => setLang('mr')}>
            मराठी
          </button>
        </div>
        <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}

export function Products() {
  const { t } = useI18n();
  const perSqft = (1 / (blockArea() * 10.7639)).toFixed(1);
  const size = Math.round(BLOCK.radius * 2 * 1000);
  return (
    <section className="section" id="products">
      <div className="container split">
        <div className="product-visual">
          <Swatch design={{ pattern: 'solid', palette: ['grey'], overrides: {} }} across={2.2} className="swatch swatch-round" />
        </div>
        <div>
          <h2 className="h2">
            {t('prod_title')} <span className="accent">{t('prod_title2')}</span>
          </h2>
          <span className="rule" />
          <p className="lead">{t('prod_sub')}</p>
          <dl className="specs">
            <div>
              <dt>{t('spec_size')}</dt>
              <dd>≈ {size} mm</dd>
            </div>
            <div>
              <dt>{t('spec_cover')}</dt>
              <dd>{t('spec_cover_v', { n: perSqft })}</dd>
            </div>
          </dl>
          <div className="thick-cards">
            {THICKNESSES.map((th) => (
              <div key={th.id} className="thick-card">
                <div className="thick-mm">{th.label}</div>
                <div className="muted">{t(th.use as Key)}</div>
                <div className="thick-price">
                  <small>{t('from')}</small> ₹{th.pricePerSqft} <small>{t('per_sqft')}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const SHOWCASE: { name: string; design: Design }[] = [
  { name: 'Terracotta + Sandstone', design: { pattern: 'diagonal', palette: ['terracotta', 'sandstone'], overrides: {} } },
  { name: 'Grey + Charcoal', design: { pattern: 'stripes', palette: ['grey', 'charcoal'], overrides: {} } },
  { name: 'Flowers', design: { pattern: 'dots', palette: ['grey', 'terracotta'], overrides: {} } },
  { name: 'Triad', design: { pattern: 'triad', palette: ['grey', 'charcoal', 'terracotta'], overrides: {} } },
  { name: 'Mixed', design: { pattern: 'mix', palette: ['grey', 'charcoal', 'sandstone'], overrides: {} } },
];

export function Patterns({ onDesign }: { onDesign: () => void }) {
  const { t } = useI18n();
  return (
    <section className="section section-alt" id="patterns">
      <div className="container">
        <h2 className="h2">
          {t('pat_title')} <span className="accent">{t('pat_title2')}</span>
        </h2>
        <span className="rule" />
        <p className="lead">{t('pat_sub')}</p>
      </div>
      <div className="carousel" tabIndex={0}>
        {SHOWCASE.map((s) => (
          <figure key={s.name} className="pattern-card">
            <Swatch design={s.design} across={4} />
            <figcaption>{s.name}</figcaption>
          </figure>
        ))}
      </div>
      <div className="container">
        <h3 className="h3">{t('colours_title')}</h3>
        <div className="colour-row">
          {COLOURS.map((c) => (
            <div key={c.id} className="colour-dot">
              <span style={{ background: `radial-gradient(circle at 35% 30%, ${c.hex}, ${c.dark})` }} />
              {t(`colour_${c.id}` as Key)}
            </div>
          ))}
        </div>
        <button className="btn btn-primary btn-wide" onClick={onDesign}>
          {t('design_own')} <span aria-hidden>→</span>
        </button>
      </div>
    </section>
  );
}

const SEGMENTS: { k: Key; d: Key; icon: string; design: Design }[] = [
  { k: 'seg_petrol', d: 'seg_petrol_d', icon: '⛽', design: { pattern: 'stripes', palette: ['grey', 'charcoal'], overrides: {} } },
  { k: 'seg_factory', d: 'seg_factory_d', icon: '🏭', design: { pattern: 'bands', palette: ['grey', 'charcoal'], overrides: {} } },
  { k: 'seg_society', d: 'seg_society_d', icon: '🏢', design: { pattern: 'mix', palette: ['terracotta', 'charcoal', 'grey'], overrides: {} } },
  { k: 'seg_shop', d: 'seg_shop_d', icon: '🏪', design: { pattern: 'dots', palette: ['sandstone', 'terracotta'], overrides: {} } },
];

export function WhereWeWork() {
  const { t } = useI18n();
  return (
    <section className="section" id="work">
      <div className="container">
        <h2 className="h2">
          {t('work_title')} <span className="accent">{t('work_title2')}</span>
        </h2>
        <span className="rule" />
        <p className="lead">{t('work_sub')}</p>
        {/* Replace these pattern cards with real project photos when available. */}
        <div className="seg-grid">
          {SEGMENTS.map((s) => (
            <article key={s.k} className="seg-card">
              <Swatch design={s.design} across={6} className="swatch seg-swatch" />
              <div className="seg-body">
                <h3>
                  <span aria-hidden>{s.icon}</span> {t(s.k)}
                </h3>
                <p>{t(s.d)}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="why">
          <h3 className="h3">{t('why_title')}</h3>
          <ul>
            {(['why_1', 'why_2', 'why_3', 'why_4'] as Key[]).map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  const { t } = useI18n();
  return (
    <section className="section section-dark" id="contact">
      <div className="container contact">
        <h2 className="h2">
          {t('contact_title')} <span className="accent">{t('contact_title2')}</span>
        </h2>
        <p className="lead">{t('contact_sub')}</p>
        <div className="contact-actions">
          <a className="btn btn-wa" href={waLink(t('wa_hello'))} target="_blank" rel="noopener">
            <WhatsAppIcon /> {t('chat_whatsapp')}
          </a>
          <a className="btn btn-ghost" href={`tel:${BRAND.phone.replace(/\s/g, '')}`}>
            {t('call')}: {BRAND.phone}
          </a>
        </div>
      </div>
      <footer className="footer">
        <Logo light />
        <span>
          © {new Date().getFullYear()} {BRAND.name} · {t('footer')}
        </span>
      </footer>
    </section>
  );
}

export function WhatsAppFab() {
  const { t } = useI18n();
  return (
    <a className="wa-fab" href={waLink(t('wa_hello'))} target="_blank" rel="noopener" aria-label={t('chat_whatsapp')}>
      <WhatsAppIcon />
    </a>
  );
}
