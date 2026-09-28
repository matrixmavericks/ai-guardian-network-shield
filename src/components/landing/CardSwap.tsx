/**
 * CardSwap — a stack of perspective cards that cycles on a timer (GSAP).
 * Adapted for the landing page: themed cards, pauses while off-screen,
 * respects reduced motion, and reports which card is in front.
 */
import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  ReactElement,
  ReactNode,
  RefObject,
  useEffect,
  useMemo,
  useRef,
} from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

export interface CardSwapProps {
  width?: number | string;
  height?: number | string;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  onCardClick?: (idx: number) => void;
  /** Called with the index of the card that is moving to the front */
  onFrontChange?: (idx: number) => void;
  skewAmount?: number;
  easing?: "linear" | "elastic";
  children: ReactNode;
}

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  customClass?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ customClass, className, ...rest }, ref) => (
  <div
    ref={ref}
    {...rest}
    className={cn(
      "absolute left-1/2 top-1/2 rounded-2xl border border-lp-line bg-lp-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8),0_0_0_1px_rgba(124,180,255,0.04)] [backface-visibility:hidden] [transform-style:preserve-3d] [will-change:transform]",
      customClass,
      className,
    )}
  />
));

Card.displayName = "Card";

type CardRef = RefObject<HTMLDivElement>;

interface Slot {
  x: number;
  y: number;
  z: number;
  zIndex: number;
}

const makeSlot = (i: number, distX: number, distY: number, total: number): Slot => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i,
});

const placeNow = (el: HTMLElement, slot: Slot, skew: number) =>
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: "center center",
    zIndex: slot.zIndex,
    force3D: true,
  });

export const CardSwap: React.FC<CardSwapProps> = ({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  onCardClick,
  onFrontChange,
  skewAmount = 6,
  easing = "elastic",
  children,
}) => {
  const childArr = useMemo(() => Children.toArray(children) as ReactElement<CardProps>[], [children]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const refs = useMemo<CardRef[]>(() => childArr.map(() => React.createRef<HTMLDivElement>()), [childArr.length]);
  const order = useRef<number[]>(Array.from({ length: childArr.length }, (_, i) => i));
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<number>(0);
  const container = useRef<HTMLDivElement>(null);
  const onFrontChangeRef = useRef(onFrontChange);
  onFrontChangeRef.current = onFrontChange;

  useEffect(() => {
    const config =
      easing === "elastic"
        ? { ease: "elastic.out(0.6,0.9)", durDrop: 2, durMove: 2, durReturn: 2, promoteOverlap: 0.9, returnDelay: 0.05 }
        : { ease: "power1.inOut", durDrop: 0.8, durMove: 0.8, durReturn: 0.8, promoteOverlap: 0.45, returnDelay: 0.2 };

    // Place by current order so a resize mid-cycle doesn't reshuffle the stack
    const total = refs.length;
    order.current.forEach((idx, i) => {
      const el = refs[idx]?.current;
      if (el) placeNow(el, makeSlot(i, cardDistance, verticalDistance, total), skewAmount);
    });

    const swap = () => {
      if (order.current.length < 2) return;
      const [front, ...rest] = order.current;
      const elFront = refs[front].current;
      if (!elFront) return;

      const tl = gsap.timeline();
      tlRef.current = tl;

      tl.to(elFront, { y: "+=500", duration: config.durDrop, ease: config.ease });

      tl.addLabel("promote", `-=${config.durDrop * config.promoteOverlap}`);
      tl.call(() => onFrontChangeRef.current?.(rest[0]), undefined, "promote");
      rest.forEach((idx, i) => {
        const el = refs[idx].current;
        if (!el) return;
        const slot = makeSlot(i, cardDistance, verticalDistance, refs.length);
        tl.set(el, { zIndex: slot.zIndex }, "promote");
        tl.to(el, { x: slot.x, y: slot.y, z: slot.z, duration: config.durMove, ease: config.ease }, `promote+=${i * 0.15}`);
      });

      const backSlot = makeSlot(refs.length - 1, cardDistance, verticalDistance, refs.length);
      tl.addLabel("return", `promote+=${config.durMove * config.returnDelay}`);
      tl.call(() => void gsap.set(elFront, { zIndex: backSlot.zIndex }), undefined, "return");
      tl.to(elFront, { x: backSlot.x, y: backSlot.y, z: backSlot.z, duration: config.durReturn, ease: config.ease }, "return");
      tl.call(() => {
        order.current = [...rest, front];
      });
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = false;
    let hovered = false;
    const start = () => {
      clearInterval(intervalRef.current);
      if (!reduced && visible && !hovered) intervalRef.current = window.setInterval(swap, delay);
    };
    const stop = () => clearInterval(intervalRef.current);

    // Only cycle while the stack is on screen
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) {
        tlRef.current?.play();
        start();
      } else {
        tlRef.current?.pause();
        stop();
      }
    });
    if (container.current) io.observe(container.current);

    const node = container.current;
    const pause = () => {
      hovered = true;
      tlRef.current?.pause();
      stop();
    };
    const resume = () => {
      hovered = false;
      tlRef.current?.play();
      start();
    };
    if (pauseOnHover && node) {
      node.addEventListener("mouseenter", pause);
      node.addEventListener("mouseleave", resume);
    }

    return () => {
      io.disconnect();
      stop();
      tlRef.current?.kill();
      if (pauseOnHover && node) {
        node.removeEventListener("mouseenter", pause);
        node.removeEventListener("mouseleave", resume);
      }
    };
  }, [cardDistance, verticalDistance, delay, pauseOnHover, skewAmount, easing, refs]);

  const rendered = childArr.map((child, i) =>
    isValidElement<CardProps>(child)
      ? cloneElement(child, {
          key: i,
          ref: refs[i],
          style: { width, height, ...(child.props.style ?? {}) },
          onClick: (e: React.MouseEvent<HTMLDivElement>) => {
            child.props.onClick?.(e);
            onCardClick?.(i);
          },
        } as CardProps & React.RefAttributes<HTMLDivElement>)
      : child,
  );

  return (
    <div ref={container} className="relative transform-gpu [perspective:1200px]" style={{ width, height }}>
      <div className="absolute inset-0 [transform-style:preserve-3d]">{rendered}</div>
    </div>
  );
};

export default CardSwap;
