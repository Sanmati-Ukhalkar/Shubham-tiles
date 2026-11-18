import { lazy, Suspense, useEffect, useState } from 'react';
import { Products, Showcase } from './components/Catalogue';
import Hero3D from './components/Hero3D';
import { Faq, Gallery, Process, Stats } from './components/More';
import { Contact, Nav, WhatsAppFab, WhereWeWork } from './components/Sections';
import type { Design } from './geometry/trihex';
import { useI18n } from './i18n';

const Designer = lazy(() => import('./designer/Designer'));

export default function App() {
  const { lang } = useI18n();
  const [designing, setDesigning] = useState(() => location.hash === '#design');
  const [startDesign, setStartDesign] = useState<Design | undefined>();
  const [showcase, setShowcase] = useState<{ blockId: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const on = () => setDesigning(location.hash === '#design');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const open = (d?: Design) => {
    setStartDesign(d);
    location.hash = 'design';
  };
  const close = () => {
    if (location.hash === '#design') history.back();
    setDesigning(false);
  };

  return (
    <div className={lang === 'mr' ? 'lang-mr' : ''}>
      <Nav onDesign={() => open()} />
      <main>
        <Hero3D onDesign={() => open()} />
        <Stats />
        <Products onOpen={(blockId, x, y) => setShowcase({ blockId, x, y })} />
        <Gallery />
        <WhereWeWork />
        <Process onDesign={() => open()} />
        <Faq />
        <Contact />
      </main>
      {!designing && !showcase && <WhatsAppFab />}
      {showcase && (
        <Showcase
          blockId={showcase.blockId}
          origin={{ x: showcase.x, y: showcase.y }}
          onClose={() => setShowcase(null)}
          onDesign={(d) => {
            setShowcase(null);
            open(d);
          }}
        />
      )}
      {designing && (
        <Suspense fallback={<div className="designer designer-loading">…</div>}>
          <Designer onClose={close} initialDesign={startDesign} />
        </Suspense>
      )}
    </div>
  );
}
