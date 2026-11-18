import { lazy, Suspense, useEffect, useState } from 'react';
import Hero3D from './components/Hero3D';
import { Contact, Nav, Patterns, Products, WhatsAppFab, WhereWeWork } from './components/Sections';
import { useI18n } from './i18n';

const Designer = lazy(() => import('./designer/Designer'));

export default function App() {
  const { lang } = useI18n();
  const [designing, setDesigning] = useState(() => location.hash === '#design');

  useEffect(() => {
    const on = () => setDesigning(location.hash === '#design');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const open = () => {
    location.hash = 'design';
  };
  const close = () => {
    if (location.hash === '#design') history.back();
    setDesigning(false);
  };

  return (
    <div className={lang === 'mr' ? 'lang-mr' : ''}>
      <Nav onDesign={open} />
      <main>
        <Hero3D onDesign={open} />
        <Products />
        <Patterns onDesign={open} />
        <WhereWeWork />
        <Contact />
      </main>
      {!designing && <WhatsAppFab />}
      {designing && (
        <Suspense fallback={<div className="designer designer-loading">…</div>}>
          <Designer onClose={close} />
        </Suspense>
      )}
    </div>
  );
}
