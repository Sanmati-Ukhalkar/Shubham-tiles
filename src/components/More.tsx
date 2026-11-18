import { useEffect, useState } from 'react';
import { BLOCKS, BRAND, COLOURS } from '../config';
import { PRESETS } from '../designs';
import { Key, useI18n } from '../i18n';

export function Stats() {
  const { t } = useI18n();
  const designs = Object.values(PRESETS).reduce((s, p) => s + p.length, 0);
  const items: [string, Key][] = [
    [String(BRAND.established), 'stat_since'],
    [BRAND.projects, 'stat_projects'],
    [String(BLOCKS.length), 'stat_products'],
    [`${Math.max(50, designs)}+`, 'stat_designs'],
    [String(COLOURS.length), 'stat_colours'],
  ];
  return (
    <section className="stats" aria-label={t('stats_label')}>
      <div className="container stats-row">
        {items.map(([v, k]) => (
          <div key={k} className="stat">
            <b>{v}</b>
            <span>{t(k)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

type Photo = { src: string; en: string; mr: string; wide?: boolean; tall?: boolean };
const PHOTOS: Photo[] = [
  { src: 'gallery/courtyard-chevron.webp', en: 'Housing courtyard · Hexa Split chevron', mr: 'गृह अंगण · हेक्सा स्प्लिट शेवरॉन', wide: true },
  { src: 'gallery/entrance-trihex-medallion.webp', en: 'Home entrance · Trihex medallion', mr: 'घराचा प्रवेश · ट्रायहेक्स मेडलियन', tall: true },
  { src: 'gallery/hexsplit-star.webp', en: 'Hexa Split star weave', mr: 'हेक्सा स्प्लिट तारा' },
  { src: 'gallery/chequer-red-border.webp', en: 'Side passage · Chequer tile with border', mr: 'बाजूचा रस्ता · चेकर टाइल', tall: true },
  { src: 'gallery/garden-walkway-trihex.webp', en: 'Garden walkway · Trihex', mr: 'बाग पायवाट · ट्रायहेक्स' },
  { src: 'gallery/shed-driveway-triangles.webp', en: 'Industrial shed · Triangles', mr: 'औद्योगिक शेड · त्रिकोण', tall: true },
  { src: 'gallery/stonebrick-rangoli.webp', en: 'House forecourt · Rangoli diamond', mr: 'घराचे अंगण · रांगोळी', wide: true },
  { src: 'gallery/hexsplit-triangles-tricolour.webp', en: 'Tricolour triangles', mr: 'तिरंगी त्रिकोण', tall: true },
  { src: 'gallery/trihex-medallions.webp', en: 'Farm plot · Trihex medallions', mr: 'शेत प्लॉट · ट्रायहेक्स मेडलियन' },
  { src: 'gallery/chequer-diagonal.webp', en: 'Open plot · Stepped diagonal', mr: 'मोकळा प्लॉट · तिरकी पायरी', tall: true },
  { src: 'gallery/shopfront-chevron.webp', en: 'Shop front · Hexa Split', mr: 'दुकानासमोर · हेक्सा स्प्लिट', tall: true },
  { src: 'gallery/hexsplit-pinwheel.webp', en: 'Pinwheel triangles', mr: 'पिनव्हील त्रिकोण' },
];

export function Gallery() {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
      if (e.key === 'ArrowRight') setOpen((o) => (o === null ? o : (o + 1) % PHOTOS.length));
      if (e.key === 'ArrowLeft') setOpen((o) => (o === null ? o : (o - 1 + PHOTOS.length) % PHOTOS.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <section className="section section-alt" id="work">
      <div className="container">
        <h2 className="h2">
          {t('gal_title')} <span className="accent">{t('gal_title2')}</span>
        </h2>
        <span className="rule" />
        <p className="lead">{t('gal_sub')}</p>
        <div className="gallery">
          {PHOTOS.map((p, i) => (
            <button key={p.src} className={`gal-item ${p.wide ? 'wide' : ''} ${p.tall ? 'tall' : ''}`} onClick={() => setOpen(i)}>
              <img src={p.src} alt={lang === 'mr' ? p.mr : p.en} loading="lazy" />
              <span>{lang === 'mr' ? p.mr : p.en}</span>
            </button>
          ))}
        </div>
      </div>
      {open !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <img src={PHOTOS[open].src} alt={lang === 'mr' ? PHOTOS[open].mr : PHOTOS[open].en} />
          <p>{lang === 'mr' ? PHOTOS[open].mr : PHOTOS[open].en}</p>
          <button className="lb-btn lb-prev" aria-label="Previous" onClick={(e) => (e.stopPropagation(), setOpen((open - 1 + PHOTOS.length) % PHOTOS.length))}>
            ‹
          </button>
          <button className="lb-btn lb-next" aria-label="Next" onClick={(e) => (e.stopPropagation(), setOpen((open + 1) % PHOTOS.length))}>
            ›
          </button>
          <button className="lb-btn lb-close" aria-label={t('close')}>
            ✕
          </button>
        </div>
      )}
    </section>
  );
}

export function Process({ onDesign }: { onDesign: () => void }) {
  const { t } = useI18n();
  const steps: [Key, Key][] = [
    ['p1_t', 'p1_d'],
    ['p2_t', 'p2_d'],
    ['p3_t', 'p3_d'],
    ['p4_t', 'p4_d'],
  ];
  return (
    <section className="section" id="process">
      <div className="container">
        <h2 className="h2">
          {t('proc_title')} <span className="accent">{t('proc_title2')}</span>
        </h2>
        <span className="rule" />
        <ol className="process">
          {steps.map(([h, d], i) => (
            <li key={h}>
              <span className="proc-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{t(h)}</h3>
              <p>{t(d)}</p>
            </li>
          ))}
        </ol>
        <button className="btn btn-primary" onClick={onDesign}>
          {t('hero_cta')} <span aria-hidden>→</span>
        </button>
      </div>
    </section>
  );
}

export function Faq() {
  const { t } = useI18n();
  const qs: [Key, Key][] = [
    ['f1_q', 'f1_a'],
    ['f2_q', 'f2_a'],
    ['f3_q', 'f3_a'],
    ['f4_q', 'f4_a'],
    ['f5_q', 'f5_a'],
  ];
  return (
    <section className="section section-alt" id="faq">
      <div className="container faq-wrap">
        <div>
          <h2 className="h2">
            {t('faq_title')} <span className="accent">{t('faq_title2')}</span>
          </h2>
          <span className="rule" />
        </div>
        <div className="faq">
          {qs.map(([q, a]) => (
            <details key={q}>
              <summary>{t(q)}</summary>
              <p>{t(a)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
