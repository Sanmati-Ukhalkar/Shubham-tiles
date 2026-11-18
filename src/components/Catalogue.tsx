import { lazy, Suspense, useEffect, useState } from 'react';
import { BLOCKS, colourById } from '../config';
import { PRESETS } from '../designs';
import type { Design } from '../geometry/trihex';
import { Key, useI18n } from '../i18n';
import { WhatsAppIcon } from './Icons';
import { Swatch, waLink } from './Sections';

const Showcase3D = lazy(() => import('./Showcase3D'));

const sizeLabel = (id: string) => {
  const b = BLOCKS.find((x) => x.id === id)!;
  const mm = (m: number) => Math.round(m * 1000);
  if (b.id === 'chequer') return '8 × 10 in';
  if (b.shape === 'trihex') return `${mm(b.length)} mm`;
  if (b.shape === 'split-hex') return `≈ ${mm(b.length)} mm`;
  return `≈ ${mm(b.length)} × ${mm(b.width)} mm`;
};

const priceLine = (id: string) => {
  const b = BLOCKS.find((x) => x.id === id)!;
  if (!b.brassPrice || !b.perBrass) return null;
  return `₹${b.brassPrice.toLocaleString('en-IN')} / brass · ${b.perBrass} blocks${b.grade ? ` · ${b.grade}` : ''}`;
};

export function Products({ onOpen }: { onOpen: (blockId: string, x: number, y: number) => void }) {
  const { t } = useI18n();
  return (
    <section className="section" id="products">
      <div className="container">
        <h2 className="h2">
          {t('cat_title')} <span className="accent">{t('cat_title2')}</span>
        </h2>
        <span className="rule" />
        <p className="lead">{t('cat_sub')}</p>
        <div className="cat-grid">
          {BLOCKS.map((b, i) => (
            <button
              key={b.id}
              className={`cat-card ${i === 0 ? 'cat-card-feature' : ''}`}
              onClick={(e) => onOpen(b.id, e.clientX, e.clientY)}
              aria-label={`${t(`block_${b.id}` as Key)} — ${t('view_3d')}`}
            >
              <div className="cat-media">
                {b.photo && <img src={b.photo} alt="" loading="lazy" />}
                <Swatch design={PRESETS[b.id][0].design} across={b.shape === 'trihex' ? 5 : 6} className="swatch cat-swatch" />
                {i === 0 && <span className="cat-badge">{t('signature')}</span>}
              </div>
              <div className="cat-body">
                <div className="cat-title">
                  <h3>{t(`block_${b.id}` as Key)}</h3>
                  <span className="cat-3d">
                    {t('view_3d')} <span aria-hidden>→</span>
                  </span>
                </div>
                <p className="cat-specs">
                  {sizeLabel(b.id)} · {b.thicknesses.map((x) => x.label).join(' / ')}
                  {priceLine(b.id) && (
                    <>
                      <br />
                      <b className="cat-price">{priceLine(b.id)}</b>
                    </>
                  )}
                </p>
                <div className="cat-colours" aria-label={t('colours')}>
                  {b.colours.map((c) => (
                    <i key={c} style={{ background: colourById(c).hex }} title={t(`colour_${c}` as Key)} />
                  ))}
                  <small>{t('designs_n', { n: PRESETS[b.id].length })}</small>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Full-screen showcase that opens with a circular reveal from where the user tapped. */
export function Showcase({
  blockId,
  origin,
  onClose,
  onDesign,
}: {
  blockId: string;
  origin: { x: number; y: number };
  onClose: () => void;
  onDesign: (d: Design) => void;
}) {
  const { t, lang } = useI18n();
  const presets = PRESETS[blockId];
  const [idx, setIdx] = useState(0);
  const [closing, setClosing] = useState(false);
  const spec = BLOCKS.find((b) => b.id === blockId)!;
  const name = t(`block_${blockId}` as Key);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 420);
  };

  const p = presets[idx];
  const msg = `${t('wa_hello_product')} ${name} — ${lang === 'mr' ? p.nameMr : p.name}.`;

  return (
    <div
      className={`showcase ${closing ? 'closing' : ''}`}
      style={{ ['--ox' as string]: `${origin.x}px`, ['--oy' as string]: `${origin.y}px` }}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <Suspense fallback={<div className="showcase-stage" />}>
        <Showcase3D design={p.design} />
      </Suspense>
      <header className="sc-top">
        <div>
          <small>{t('cat_title2')}</small>
          <h2>{name}</h2>
        </div>
        <button className="sc-close" onClick={close} aria-label={t('close')}>
          ✕
        </button>
      </header>
      <p className="sc-hint">{t('sc_hint')}</p>
      <div className="sc-panel">
        <div className="sc-designs" role="tablist" aria-label={t('sc_designs')}>
          {presets.map((pr, i) => (
            <button key={pr.id} role="tab" aria-selected={i === idx} className={`sc-chip ${i === idx ? 'on' : ''}`} onClick={() => setIdx(i)}>
              <Swatch design={pr.design} across={spec.shape === 'trihex' ? 3 : 4} className="swatch sc-chip-swatch" />
              <span>{lang === 'mr' ? pr.nameMr : pr.name}</span>
            </button>
          ))}
        </div>
        <div className="sc-meta">
          <span>{sizeLabel(blockId)}</span>
          <span>{spec.thicknesses.map((x) => x.label).join(' / ')}</span>
          {priceLine(blockId) && <span className="sc-price">{priceLine(blockId)}</span>}
          <span className="sc-dots">
            {spec.colours.map((c) => (
              <i key={c} style={{ background: colourById(c).hex }} />
            ))}
          </span>
        </div>
        <div className="sc-actions">
          <button className="btn btn-primary" onClick={() => onDesign(p.design)}>
            {t('sc_design_floor')} <span aria-hidden>→</span>
          </button>
          <a className="btn btn-wa" href={waLink(msg)} target="_blank" rel="noopener">
            <WhatsAppIcon /> {t('sc_enquire')}
          </a>
        </div>
      </div>
    </div>
  );
}
