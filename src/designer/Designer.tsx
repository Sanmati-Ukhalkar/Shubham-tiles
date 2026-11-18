import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BLOCKS, COLOURS, colourById, SQFT_PER_M2 } from '../config';
import { Swatch } from '../components/Sections';
import { Logo } from '../components/Icons';
import { estimate, num } from '../geometry/estimate';
import { blockById, Design, layoutOf, layoutsFor, PATTERNS, polygonArea, Pt, tileAt, tilesInPolygon } from '../geometry/trihex';
import { Key, useI18n } from '../i18n';
import EstimateStep from './EstimateStep';
import PlanCanvas from './PlanCanvas';
import { toM } from './plan';

const Preview3D = lazy(() => import('./Preview3D'));

type Mode = 'rect' | 'l' | 'draw';
export type Env = 'factory' | 'petrol' | 'society' | 'shop';

const rectPoly = (w: number, l: number): Pt[] => [
  { x: 0, y: 0 },
  { x: w, y: 0 },
  { x: w, y: l },
  { x: 0, y: l },
];
const lPoly = (w: number, l: number, cw: number, ch: number): Pt[] => {
  cw = Math.min(cw, w - 1);
  ch = Math.min(ch, l - 1);
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: l - ch },
    { x: w - cw, y: l - ch },
    { x: w - cw, y: l },
    { x: 0, y: l },
  ];
};

const DRAW_EXTENT = { w: 60, h: 45 };

export default function Designer({ onClose, initialDesign }: { onClose: () => void; initialDesign?: Design }) {
  const { t, lang, setLang } = useI18n();
  const [step, setStep] = useState(0);

  // ── step 1: area ──
  const [mode, setMode] = useState<Mode>('l');
  const [dims, setDims] = useState({ w: 40, l: 25, cw: 15, ch: 10 });
  const [drawPts, setDrawPts] = useState<Pt[]>([]);
  const [drawClosed, setDrawClosed] = useState(false);
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [photoOpacity, setPhotoOpacity] = useState(0.5);

  const polyFt = useMemo(() => {
    if (mode === 'rect') return rectPoly(dims.w, dims.l);
    if (mode === 'l') return lPoly(dims.w, dims.l, dims.cw, dims.ch);
    return drawPts;
  }, [mode, dims, drawPts]);
  const closed = mode !== 'draw' || drawClosed;
  const areaSqft = closed && polyFt.length > 2 ? polygonArea(polyFt.map(toM)) * SQFT_PER_M2 : 0;

  // ── step 2: block + pattern ──
  const [design, setDesign] = useState<Design>(
    () => initialDesign ?? { blockId: BLOCKS[0].id, layoutId: undefined, pattern: 'stripes', palette: ['grey', 'terracotta'], overrides: {} },
  );
  const [painting, setPainting] = useState(false);
  const [brush, setBrush] = useState('terracotta');
  const spec = blockById(design.blockId);
  const layout = layoutOf(design);
  const [thicknessId, setThicknessId] = useState(spec.thicknesses[0].id);
  const thickness = spec.thicknesses.find((x) => x.id === thicknessId) ?? spec.thicknesses[0];

  const chooseBlock = (id: string) => {
    const b = blockById(id);
    setDesign((d) => ({
      ...d,
      blockId: id,
      layoutId: undefined,
      overrides: {},
      palette: d.palette.filter((c) => b.colours.includes(c)).length ? d.palette.filter((c) => b.colours.includes(c)) : b.colours.slice(0, 2),
    }));
    setThicknessId(b.thicknesses[0].id);
  };

  const polyM = useMemo(() => polyFt.map(toM), [polyFt]);
  const tiles = useMemo(() => (closed && polyM.length > 2 ? tilesInPolygon(polyM, layout) : []), [closed, polyM, layout]);
  const est = useMemo(() => estimate(polyM, tiles, design, thickness), [polyM, tiles, design, thickness]);

  // ── step 3: 3D ──
  const [env, setEnv] = useState<Env>('factory');
  const [night, setNight] = useState(false);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  // lock page scroll while the designer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onDrawTap = (ft: Pt) => {
    if (mode !== 'draw' || drawClosed) return;
    const p = { x: Math.round(Math.min(DRAW_EXTENT.w, Math.max(0, ft.x))), y: Math.round(Math.min(DRAW_EXTENT.h, Math.max(0, ft.y))) };
    if (drawPts.length >= 3 && Math.hypot(p.x - drawPts[0].x, p.y - drawPts[0].y) <= 1.5) {
      setDrawClosed(true);
      return;
    }
    const last = drawPts[drawPts.length - 1];
    if (last && last.x === p.x && last.y === p.y) return;
    setDrawPts([...drawPts, p]);
  };

  const onPaint = (_ft: Pt, m: Pt) => {
    const hit = tileAt(m, layout);
    if (!hit) return;
    const key = `${hit.q},${hit.r},${hit.k}`;
    if (design.overrides[key] === brush) return;
    setDesign((d) => ({ ...d, overrides: { ...d.overrides, [key]: brush } }));
  };

  const togglePalette = (id: string) => {
    setDesign((d) => {
      if (d.palette.includes(id)) {
        if (d.palette.length === 1) return d;
        return { ...d, palette: d.palette.filter((c) => c !== id) };
      }
      if (d.palette.length >= 3) return { ...d, palette: [...d.palette.slice(1), id] };
      return { ...d, palette: [...d.palette, id] };
    });
    setBrush(id);
  };

  const loadPhoto = (f: File | undefined) => {
    if (!f) return;
    const img = new Image();
    img.onload = () => setPhoto(img);
    img.src = URL.createObjectURL(f);
    setMode('draw');
  };

  const steps: Key[] = ['step_draw', 'step_pattern', 'step_3d', 'step_est'];
  const canNext = closed && polyFt.length > 2 && areaSqft > 1;

  return (
    <div className="designer" role="dialog" aria-modal="true">
      <header className="d-top">
        <button className="d-logo" onClick={onClose} aria-label={t('close')}>
          <Logo />
        </button>
        <div className="nav-right">
          <div className="lang lang-light">
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
              EN
            </button>
            <button className={lang === 'mr' ? 'on' : ''} onClick={() => setLang('mr')}>
              मराठी
            </button>
          </div>
          <button className="d-close" onClick={onClose} aria-label={t('close')}>
            ✕
          </button>
        </div>
      </header>

      <div className="d-scroll">
        <div className="d-inner">
          {step < 3 && (
            <>
              <h1 className="d-h1">
                {t('d_title')} <span className="accent">{t('d_title2')}</span>
              </h1>
              <p className="muted d-sub">{t('d_sub')}</p>
            </>
          )}
          <ol className="stepper">
            {steps.map((k, i) => (
              <li key={k} className={i === step ? 'on' : i < step ? 'done' : ''}>
                <button disabled={i > step && !canNext} onClick={() => (i <= step || canNext) && setStep(i)}>
                  <span className="num">{i < step ? '✓' : i + 1}</span>
                  <span className="lbl">{t(k)}</span>
                </button>
              </li>
            ))}
          </ol>

          {step === 0 && (
            <section className="card">
              <h2 className="h3">{t('draw_title')}</h2>
              <p className="muted small">{mode === 'draw' ? t('draw_help_draw') : t('draw_help_rect')}</p>
              <PlanCanvas
                polyFt={polyFt}
                closed={closed}
                extentFt={mode === 'draw' ? DRAW_EXTENT : undefined}
                photo={mode === 'draw' ? photo : null}
                photoOpacity={photoOpacity}
                onTap={mode === 'draw' ? onDrawTap : undefined}
              />
              {mode !== 'draw' && (
                <div className="dim-inputs">
                  <NumField label={t('width_ft')} value={dims.w} onChange={(w) => setDims({ ...dims, w })} />
                  <NumField label={t('length_ft')} value={dims.l} onChange={(l) => setDims({ ...dims, l })} />
                  {mode === 'l' && (
                    <>
                      <NumField label={`${t('cut_ft')} ↔`} value={dims.cw} onChange={(cw) => setDims({ ...dims, cw })} />
                      <NumField label={`${t('cut_ft')} ↕`} value={dims.ch} onChange={(ch) => setDims({ ...dims, ch })} />
                    </>
                  )}
                </div>
              )}
              {mode === 'draw' && photo && (
                <div className="photo-row">
                  <label>
                    {t('photo_opacity')}
                    <input type="range" min={0.1} max={1} step={0.05} value={photoOpacity} onChange={(e) => setPhotoOpacity(+e.target.value)} />
                  </label>
                  <button className="chip" onClick={() => setPhoto(null)}>
                    {t('remove_photo')}
                  </button>
                </div>
              )}
              <div className="tools">
                <ToolBtn on={mode === 'draw'} icon="✎" label={t('tool_draw')} onClick={() => setMode('draw')} />
                <ToolBtn on={mode === 'rect'} icon="▭" label={t('tool_rect')} onClick={() => setMode('rect')} />
                <ToolBtn on={mode === 'l'} icon="⌐" label={t('tool_l')} onClick={() => setMode('l')} />
                <label className="tool">
                  <span className="ico">⇪</span>
                  <span>{t('tool_upload')}</span>
                  <input type="file" accept="image/*" hidden onChange={(e) => loadPhoto(e.target.files?.[0])} />
                </label>
                {mode === 'draw' && (
                  <>
                    <ToolBtn
                      icon="↶"
                      label={t('tool_undo')}
                      onClick={() => (drawClosed ? setDrawClosed(false) : setDrawPts(drawPts.slice(0, -1)))}
                    />
                    <ToolBtn
                      icon="⌫"
                      label={t('tool_clear')}
                      onClick={() => {
                        setDrawPts([]);
                        setDrawClosed(false);
                      }}
                    />
                  </>
                )}
              </div>
              <div className="area-pill">
                {t('area')}: <b>{canNext ? `${num(areaSqft)} sq ft` : '—'}</b>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="card">
              <h2 className="h3">{t('pat_choose_title')}</h2>
              <p className="muted small">{painting ? t('paint_on') : t('pat_choose_help')}</p>
              <PlanCanvas polyFt={polyFt} closed tiles={tiles} design={design} onTap={painting ? onPaint : undefined} dragPaint={painting} />
              <h3 className="h4">{t('block_type')}</h3>
              <div className="layout-row">
                {BLOCKS.map((b) => (
                  <button key={b.id} className={`layout-btn ${spec.id === b.id ? 'on' : ''}`} onClick={() => chooseBlock(b.id)}>
                    <Swatch design={{ blockId: b.id, pattern: 'solid', palette: [b.colours[0]], overrides: {} }} across={2.4} className="swatch layout-swatch" />
                    <span>{t(`block_${b.id}` as Key)}</span>
                  </button>
                ))}
              </div>
              {layoutsFor(spec.id).length > 1 && (
                <>
                  <h3 className="h4">{t('laying_style')}</h3>
                  <div className="env-row">
                    {layoutsFor(spec.id).map((l) => (
                      <button
                        key={l.id}
                        className={`chip ${layout.id === l.id ? 'chip-on' : ''}`}
                        onClick={() => setDesign({ ...design, layoutId: l.id, overrides: {} })}
                      >
                        {t(`lay_${l.id}` as Key)}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div className="row-between">
                <h3 className="h4">{t('layouts')}</h3>
              </div>
              <div className="layout-row">
                {PATTERNS.map((p) => (
                  <button
                    key={p}
                    className={`layout-btn ${design.pattern === p ? 'on' : ''}`}
                    onClick={() => setDesign({ ...design, pattern: p })}
                  >
                    <Swatch design={{ ...design, pattern: p, overrides: {} }} across={3.2} className="swatch layout-swatch" />
                    <span>{t(`pattern_${p}` as Key)}</span>
                  </button>
                ))}
              </div>
              <h3 className="h4">{t('palette')}</h3>
              <div className="palette-row">
                {COLOURS.filter((c) => spec.colours.includes(c.id)).map((c) => {
                  const idx = design.palette.indexOf(c.id);
                  return (
                    <button
                      key={c.id}
                      className={`pal ${idx >= 0 ? 'on' : ''} ${painting && brush === c.id ? 'brush' : ''}`}
                      onClick={() => (painting ? setBrush(c.id) : togglePalette(c.id))}
                    >
                      <span className="dot" style={{ background: `radial-gradient(circle at 35% 30%, ${c.hex}, ${c.dark})` }}>
                        {idx >= 0 && !painting && <i>{idx + 1}</i>}
                      </span>
                      {t(`colour_${c.id}` as Key)}
                    </button>
                  );
                })}
                <button className={`pal paint ${painting ? 'on' : ''}`} onClick={() => setPainting(!painting)}>
                  <span className="dot dot-paint">🖌</span>
                  {t('paint')}
                </button>
              </div>
              {Object.keys(design.overrides).length > 0 && (
                <button className="chip" onClick={() => setDesign({ ...design, overrides: {} })}>
                  {t('reset_paint')}
                </button>
              )}
              <h3 className="h4">{t('thickness')}</h3>
              <div className="seg-toggle">
                {spec.thicknesses.map((th) => (
                  <button key={th.id} className={th.id === thicknessId ? 'on' : ''} onClick={() => setThicknessId(th.id)}>
                    <b>{th.label}</b>
                    <small>{t(th.use as Key)}</small>
                  </button>
                ))}
              </div>
              <div className="mini-est">
                <span>
                  {num(est.areaSqft)} sq ft · {num(est.blocksOrder)} blocks
                </span>
                <span className="mini-cols">
                  {est.byColour.map((c) => (
                    <i key={c.id} style={{ background: colourById(c.id).hex }} title={c.id} />
                  ))}
                </span>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="card card-flush">
              <div className="card-pad">
                <h2 className="h3">{t('view_title')}</h2>
                <p className="muted small">{t('view_help')}</p>
                <div className="env-row">
                  {(['factory', 'petrol', 'society', 'shop'] as Env[]).map((e) => (
                    <button key={e} className={`chip ${env === e ? 'chip-on' : ''}`} onClick={() => setEnv(e)}>
                      {t(`env_${e}` as Key)}
                    </button>
                  ))}
                </div>
              </div>
              <Suspense fallback={<div className="preview3d preview-loading">…</div>}>
                <Preview3D polyM={polyM} tiles={tiles} design={design} env={env} night={night} onSnapshot={setSnapshot} thicknessMm={thickness.mm} />
              </Suspense>
              <div className="card-pad preview-ctrls">
                <div className="seg-toggle seg-small">
                  <button className={!night ? 'on' : ''} onClick={() => setNight(false)}>
                    ☀ {t('day')}
                  </button>
                  <button className={night ? 'on' : ''} onClick={() => setNight(true)}>
                    ☾ {t('night')}
                  </button>
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <EstimateStep
              est={est}
              design={design}
              polyFt={polyFt}
              tiles={tiles}
              thickness={thickness}
              snapshot={snapshot}
            />
          )}
        </div>
      </div>

      {step < 3 && (
        <footer className="d-foot">
          {step > 0 && (
            <button className="btn btn-square" onClick={() => setStep(step - 1)} aria-label={t('back')}>
              ←
            </button>
          )}
          <button className="btn btn-primary btn-grow" disabled={!canNext} onClick={() => setStep(step + 1)}>
            {!canNext ? t('need_shape') : step === 0 ? t('next_pattern') : step === 1 ? t('next_3d') : t('next_est')} <span aria-hidden>→</span>
          </button>
        </footer>
      )}
      {step === 3 && (
        <footer className="d-foot">
          <button className="btn btn-square" onClick={() => setStep(2)} aria-label={t('back')}>
            ←
          </button>
          <button className="btn btn-ghost-dark btn-grow" onClick={() => setStep(1)}>
            {t('step_pattern')}
          </button>
        </footer>
      )}
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => setTxt(String(value)), [value]);
  return (
    <label className="num-field">
      <span>{label}</span>
      <input
        inputMode="decimal"
        value={txt}
        onChange={(e) => {
          setTxt(e.target.value);
          const n = parseFloat(e.target.value);
          if (n > 0 && n <= 1000) onChange(n);
        }}
      />
    </label>
  );
}

function ToolBtn({ on, icon, label, onClick }: { on?: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button className={`tool ${on ? 'on' : ''}`} onClick={onClick}>
      <span className="ico">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
