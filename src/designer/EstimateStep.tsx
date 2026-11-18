import { useMemo, useState } from 'react';
import { BLOCK, BRAND, colourById, Thickness } from '../config';
import { waLink } from '../components/Sections';
import { WhatsAppIcon } from '../components/Icons';
import { Estimate, inr, num } from '../geometry/estimate';
import { Design, Pt, Tile } from '../geometry/trihex';
import { Key, useI18n } from '../i18n';
import { planImage } from './plan';

type Props = {
  est: Estimate;
  design: Design;
  polyFt: Pt[];
  tiles: Tile[];
  thickness: Thickness;
  snapshot: string | null;
};

export default function EstimateStep({ est, design, polyFt, tiles, thickness, snapshot }: Props) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const planUrl = useMemo(
    () => planImage({ polyFt, closed: true, tiles, design, showDims: true }, 1000, 750).toDataURL('image/png'),
    [polyFt, tiles, design],
  );

  const colourName = (id: string) => t(`colour_${id}` as Key);
  const patternName = t(`pattern_${design.pattern}` as Key);
  const sides = polyFt
    .map((a, i) => {
      const b = polyFt[(i + 1) % polyFt.length];
      return `${+Math.hypot(b.x - a.x, b.y - a.y).toFixed(1)}`;
    })
    .join(', ');

  const message = [
    t('wa_hello'),
    '',
    `• ${t('area')}: ${num(est.areaSqft)} sq ft (sides: ${sides} ft)`,
    `• ${BLOCK.name} ${thickness.label}, ${patternName}`,
    `• ${t('blocks_needed')}: ${num(est.blocksOrder)}`,
    ...est.byColour.map((c) => `   - ${colourName(c.id)}: ${num(c.count)}`),
    `• ${t('est_cost')}: ${inr(est.cost)} (approx.)`,
  ].join('\n');

  const savePng = () => {
    const a = document.createElement('a');
    a.href = planUrl;
    a.download = `${BRAND.name.toLowerCase()}-design.png`;
    a.click();
  };

  const savePdf = async () => {
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210;
      doc.setFillColor(242, 106, 27);
      doc.rect(0, 0, W, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(BRAND.name, 14, 14);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`${BRAND.tagline}  |  ${BRAND.phone}  |  ${BRAND.email}`, W - 14, 14, { align: 'right' });

      doc.setTextColor(30, 30, 30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Your Paving Design', 14, 34);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), 14, 40);

      let y = 46;
      const imgW = W - 28;
      if (snapshot) {
        doc.addImage(snapshot, 'JPEG', 14, y, imgW, imgW * 0.56);
        y += imgW * 0.56 + 4;
      }
      const planH = snapshot ? 70 : 110;
      doc.addImage(planUrl, 'PNG', 14 + (imgW - planH / 0.75) / 2, y, planH / 0.75, planH);
      y += planH + 8;

      const rows: [string, string][] = [
        ['Area', `${num(est.areaSqft)} sq ft`],
        ['Block', `${BLOCK.name}, ${thickness.label}`],
        ['Pattern', design.pattern],
        ['Blocks needed', `${num(est.blocksOrder)} (edge cuts + ${Math.round(BLOCK.wastage * 100)}% spare)`],
        ...est.byColour.map((c): [string, string] => [`  ${c.id[0].toUpperCase()}${c.id.slice(1)}`, num(c.count)]),
        ['Estimated cost', `Rs ${Math.round(est.cost).toLocaleString('en-IN')} (approx., @ Rs ${est.rate}/sq ft)`],
      ];
      doc.setFontSize(11);
      for (const [k, v] of rows) {
        doc.setTextColor(110, 110, 110);
        doc.text(k, 14, y);
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'bold');
        doc.text(v, 70, y);
        doc.setFont('helvetica', 'normal');
        y += 7;
      }
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text('Estimate is indicative. Final quote depends on site survey, laying, transport and GST.', 14, 287);
      doc.save(`${BRAND.name.toLowerCase()}-design.pdf`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="estimate">
      <h1 className="d-h1">
        {t('your_design')} <span className="accent">{t('your_design2')}</span>
      </h1>
      <span className="rule" />
      <p className="muted d-sub">{t('est_sub')}</p>
      <img className="est-hero" src={snapshot ?? planUrl} alt="" />
      <div className="est-card">
        <Row icon="⬚" title={t('area')} sub={t('total_area')} value={<b className="big">{num(est.areaSqft)} sq ft</b>} />
        <Row
          icon="⬢"
          title={t('blocks_needed')}
          sub={t('blocks_note', { p: Math.round(BLOCK.wastage * 100) })}
          value={<b className="big">{num(est.blocksOrder)}</b>}
        />
        <Row
          icon="◐"
          title={t('colours')}
          sub={t('per_colour')}
          value={
            <div className="col-list">
              {est.byColour.map((c) => (
                <span key={c.id}>
                  <i style={{ background: colourById(c.id).hex }} />
                  {colourName(c.id)} — {num(c.count)}
                </span>
              ))}
            </div>
          }
        />
        <Row
          icon="₹"
          title={t('est_cost')}
          sub={t('est_note', { r: `₹${est.rate}` })}
          value={
            <b className="big accent-bg">
              {inr(est.cost)}
              <small>(approx.)</small>
            </b>
          }
        />
      </div>
      <a className="btn btn-wa btn-block" href={waLink(message)} target="_blank" rel="noopener">
        <WhatsAppIcon /> {t('send_wa')} <span aria-hidden>→</span>
      </a>
      <div className="est-dl">
        <button className="btn btn-outline" onClick={savePdf} disabled={busy}>
          ⤓ {t('download_pdf')}
        </button>
        <button className="btn btn-outline" onClick={savePng}>
          ⤓ {t('download_png')}
        </button>
      </div>
      <p className="muted tiny">{t('disclaimer')}</p>
    </section>
  );
}

function Row({ icon, title, sub, value }: { icon: string; title: string; sub: string; value: React.ReactNode }) {
  return (
    <div className="est-row">
      <span className="est-ico">{icon}</span>
      <div className="est-lbl">
        <b>{title}</b>
        <small>{sub}</small>
      </div>
      <div className="est-val">{value}</div>
    </div>
  );
}
