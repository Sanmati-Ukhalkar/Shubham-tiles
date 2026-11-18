import { useEffect, useRef } from 'react';
import { FT } from '../config';
import { Pt } from '../geometry/trihex';
import { drawPlan, PlanOpts, planView } from './plan';

type Props = PlanOpts & {
  /** Called with the tapped point in feet (and metres). */
  onTap?: (ft: Pt, m: Pt) => void;
  /** Continuous painting while dragging. */
  dragPaint?: boolean;
  className?: string;
};

export default function PlanCanvas(props: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const redraw = () => {
    const c = ref.current;
    if (!c) return;
    const w = c.clientWidth;
    const h = c.clientHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    drawPlan(c.getContext('2d')!, { ...propsRef.current, dpr }, w, h);
  };

  useEffect(redraw);
  useEffect(() => {
    const ro = new ResizeObserver(redraw);
    ro.observe(ref.current!);
    return () => ro.disconnect();
  }, []);

  const toWorld = (e: React.PointerEvent) => {
    const c = ref.current!;
    const r = c.getBoundingClientRect();
    const v = planView(propsRef.current, c.clientWidth, c.clientHeight);
    const m = { x: (e.clientX - r.left - v.ox) / v.scale, y: (e.clientY - r.top - v.oy) / v.scale };
    return { m, ft: { x: m.x / FT, y: m.y / FT } };
  };

  const down = useRef(false);
  return (
    <canvas
      ref={ref}
      className={props.className ?? 'plan-canvas'}
      style={{ touchAction: props.dragPaint ? 'none' : 'manipulation' }}
      onPointerDown={(e) => {
        if (!props.onTap) return;
        down.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        const w = toWorld(e);
        props.onTap(w.ft, w.m);
      }}
      onPointerMove={(e) => {
        if (!down.current || !props.dragPaint || !props.onTap) return;
        const w = toWorld(e);
        props.onTap(w.ft, w.m);
      }}
      onPointerUp={() => (down.current = false)}
      onPointerCancel={() => (down.current = false)}
    />
  );
}
