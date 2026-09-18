import React from 'react'
import { cn } from '@/lib/utils'

export function KhazprokhirLogo({
  className,
  size = 'md',
  iconOnly = false,
  showText = true,
}) {
  // Dimension presets (aspect ratio of viewBox 200 300 1550 480 is ~ 3.23:1 for full logo)
  // Icon viewBox: 220 340 360 400
  const sizeClasses = {
    sm: iconOnly ? 'w-7 h-7' : 'h-7 w-auto',
    md: iconOnly ? 'w-9 h-9' : 'h-9 w-auto',
    lg: iconOnly ? 'w-12 h-12' : 'h-12 w-auto',
    xl: iconOnly ? 'w-16 h-16' : 'h-16 w-auto',
    hero: iconOnly ? 'w-24 h-24' : 'h-20 w-auto',
  }

  const d1 = "M 386.92 367.49 L 367.08 378.94 L 334.56 397.72 L 302.03 416.49 C 294.81 420.66 291.20 427.97 291.20 435.27 C 291.20 442.57 294.81 449.88 302.03 454.05 L 334.56 435.27 L 367.08 416.49 L 367.08 416.49 L 432.13 378.94 L 412.30 367.49 C 408.37 365.22 403.99 364.09 399.61 364.09 C 395.23 364.09 390.85 365.22 386.92 367.49 Z"
  const d2 = "M 451.97 405.04 L 432.14 416.49 L 432.13 416.49 L 399.61 435.27 L 367.08 454.05 L 347.25 465.50 C 339.40 470.04 329.72 470.04 321.87 465.50 L 302.03 454.05 C 294.81 449.88 291.20 442.57 291.20 435.27 C 291.20 427.97 294.81 420.66 302.03 416.49 L 269.51 435.27 L 249.68 446.72 C 241.82 451.25 236.98 459.64 236.98 468.70 L 236.98 627.18 C 236.98 636.24 241.82 644.62 249.68 649.15 L 269.51 660.61 L 269.51 510.38 C 269.51 497.72 279.90 488.66 291.23 488.66 C 294.84 488.66 298.54 489.59 302.03 491.60 L 302.03 664.73 C 302.03 673.80 306.87 682.18 314.72 686.71 L 334.56 698.16 L 334.56 527.09 C 334.56 516.75 340.07 507.20 349.02 502.03 L 367.08 491.60 L 399.61 472.83 L 432.13 454.05 L 464.66 435.27 L 497.18 416.49 L 477.35 405.04 C 473.42 402.77 469.04 401.64 464.66 401.64 C 460.28 401.64 455.90 402.77 451.97 405.04 Z"
  const d3 = "M 379.77 521.83 C 371.92 526.37 367.08 534.74 367.08 543.81 L 367.08 702.29 C 367.08 711.36 371.92 719.73 379.77 724.26 L 399.61 735.72 L 399.61 547.94 C 398.90 542.58 398.38 532.74 402.62 521.78 C 407.10 510.19 414.90 502.52 421.48 497.75 Z"
  const d4 = "M 497.18 454.05 L 464.66 472.83 L 432.13 491.60 L 421.48 497.75 L 421.48 497.75 C 414.90 502.52 407.10 510.19 402.62 521.78 C 398.38 532.74 398.90 542.58 399.61 547.94 L 432.13 529.16 L 464.66 510.38 L 497.18 491.60 L 529.70 472.83 L 529.70 495.73 C 529.70 504.80 524.86 513.18 517.01 517.72 L 497.18 529.16 L 464.66 547.94 L 444.82 559.39 C 436.97 563.92 432.13 572.30 432.13 581.37 L 432.13 716.94 L 451.97 705.49 C 459.82 700.96 464.66 692.58 464.66 683.51 L 464.66 660.61 L 497.18 641.83 L 529.70 623.05 L 529.70 660.61 L 549.54 649.15 C 557.39 644.62 562.23 636.24 562.23 627.18 L 562.23 468.70 C 562.23 459.64 557.39 451.25 549.54 446.72 L 529.70 435.27 Z M 464.66 600.15 C 464.66 591.08 469.50 582.70 477.35 578.17 L 497.18 566.72 L 529.70 547.94 L 529.70 570.84 C 529.70 579.91 524.86 588.29 517.02 592.82 L 497.18 604.27 L 464.66 623.05 Z"

  if (iconOnly) {
    return (
      <svg
        viewBox="230 355 340 390"
        className={cn('shrink-0', sizeClasses[size], className)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="khazLogoBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0a194f" />
            <stop offset="50%" stopColor="#0066b3" />
            <stop offset="100%" stopColor="#00b4d8" />
          </linearGradient>
          <linearGradient id="khazLogoPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a00e0" />
            <stop offset="50%" stopColor="#8e2de2" />
            <stop offset="100%" stopColor="#d946ef" />
          </linearGradient>
        </defs>
        <path d={d1} fill="url(#khazLogoBlueGrad)" />
        <path d={d2} fill="url(#khazLogoBlueGrad)" />
        <path d={d3} fill="url(#khazLogoPurpleGrad)" />
        <path d={d4} fill="url(#khazLogoPurpleGrad)" fillRule="evenodd" />
      </svg>
    )
  }

  return (
    <svg
      viewBox="220 320 1520 440"
      className={cn('shrink-0', sizeClasses[size], className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="khazFullBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a194f" />
          <stop offset="50%" stopColor="#0066b3" />
          <stop offset="100%" stopColor="#00b4d8" />
        </linearGradient>
        <linearGradient id="khazFullPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4a00e0" />
          <stop offset="50%" stopColor="#8e2de2" />
          <stop offset="100%" stopColor="#d946ef" />
        </linearGradient>
      </defs>

      {/* Hexagon icon */}
      <g>
        <path d={d1} fill="url(#khazFullBlueGrad)" />
        <path d={d2} fill="url(#khazFullBlueGrad)" />
        <path d={d3} fill="url(#khazFullPurpleGrad)" />
        <path d={d4} fill="url(#khazFullPurpleGrad)" fillRule="evenodd" />
      </g>

      {/* Thin divider line */}
      <line
        x1="652.62"
        y1="340"
        x2="652.62"
        y2="739"
        stroke="currentColor"
        strokeWidth="3.5"
        className="text-slate-400 dark:text-slate-600"
      />

      {/* Brand Text */}
      {showText && (
        <text
          x="730"
          y="585"
          fontFamily="Plus Jakarta Sans, Inter, sans-serif"
          fontSize="124"
          fontWeight="300"
          letterSpacing="0.08em"
          fill="currentColor"
          className="text-pitch dark:text-white"
        >
          KHAZPROKHIR
        </text>
      )}
    </svg>
  )
}

