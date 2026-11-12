// Brand shapes for the marketing site, drawn from the KENNION wordmark.
// K_PATH is the wordmark's K (same rounded construction), origin top-left.
import { useId } from "react";

export const K_PATH = "M28.0 0.0L22.5 0.5L17.3 2.1L12.4 4.7L8.2 8.2L4.7 12.4L2.1 17.3L0.5 22.5L0.0 28.0L0.0 972.0L0.5 977.5L2.1 982.7L6.4 989.8L10.2 993.6L14.8 996.7L19.9 998.8L28.0 1000.0L222.0 1000.0L230.1 998.8L235.2 996.7L239.8 993.6L245.3 987.6L248.8 980.1L250.0 972.0L250.2 624.4L252.1 616.6L254.6 611.8L258.0 607.6L262.1 604.1L266.8 601.5L272.0 599.8L277.3 599.2L285.4 600.1L292.8 603.4L299.0 608.6L303.7 616.0L474.0 983.8L478.3 990.4L482.2 994.1L489.0 998.0L494.1 999.5L499.4 1000.0L792.0 1000.0L797.6 999.4L802.9 997.8L810.1 993.4L813.9 989.4L817.0 984.6L819.6 976.7L819.7 968.3L817.4 960.2L610.0 512.4L608.0 506.7L607.2 498.7L608.0 493.3L610.0 487.6L817.4 39.8L819.7 31.7L819.9 26.1L818.1 17.9L813.9 10.6L810.1 6.6L805.4 3.4L800.3 1.3L792.0 0.0L499.4 0.0L494.1 0.5L489.0 2.0L482.2 5.9L478.3 9.6L474.0 16.2L303.7 384.0L299.0 391.4L292.8 396.6L285.4 399.9L277.3 400.8L272.0 400.2L266.8 398.5L260.0 394.3L256.2 390.4L253.2 385.9L251.2 380.9L250.2 375.6L250.0 28.0L248.8 19.9L245.3 12.4L241.8 8.2L235.2 3.3L230.1 1.2L224.7 0.1Z";
export const K_W = 820;
export const K_H = 1000;

/** The K alone, as a scalable SVG. Set size via className (height). */
export function KMark({ className = "", fill = "currentColor" }: { className?: string; fill?: string }) {
  return (
    <svg viewBox={`0 0 ${K_W} ${K_H}`} className={className} aria-hidden="true" focusable="false">
      <path d={K_PATH} fill={fill} />
    </svg>
  );
}

/** Staggered tone-on-tone K pattern that fills its (relative) parent. */
export function KPattern({ fill = "rgba(255,255,255,0.05)", size = 44, className = "" }: {
  fill?: string; size?: number; className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const s = size / K_H;            // scale K to `size` px tall
  const cw = size * 1.25;          // cell width
  const ch = size * 1.3;           // cell height
  return (
    <svg className={`absolute inset-0 h-full w-full ${className}`} aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`kp${id}`} width={cw * 2} height={ch * 2} patternUnits="userSpaceOnUse">
          <path d={K_PATH} fill={fill} transform={`translate(0 0) scale(${s})`} />
          <path d={K_PATH} fill={fill} transform={`translate(${cw * 2} 0) scale(${s})`} />
          <path d={K_PATH} fill={fill} transform={`translate(${cw} ${ch}) scale(${s})`} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#kp${id})`} />
    </svg>
  );
}

/** The K's chevron as a solid shape, pointing left. Stretches to its box. */
export function Chevron({ className = "", fill = "currentColor" }: { className?: string; fill?: string }) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden="true" focusable="false">
      <polygon points="38,0 100,0 100,100 38,100 0,50" fill={fill} />
    </svg>
  );
}
