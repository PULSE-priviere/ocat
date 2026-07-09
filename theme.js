// theme.js — Shared design tokens (Vercel/Linear-inspired)

export const C = {
  navy:   '#18181B',   // zinc-900 (ex #1B3A5C)
  ink:    '#18181B',   // zinc-900
  mid:    '#52525B',   // zinc-600
  muted:  '#A1A1AA',   // zinc-400
  rule:   '#E4E4E7',   // zinc-200
  bg:     '#FAFAFA',   // neutral-50
  white:  '#FFFFFF',
  red:    '#F87171',   // red-400  (ex #DC2626)
  orange: '#FBBF24',   // amber-300 (ex #D97706)
  green:  '#4ADE80',   // green-400 (ex #16A34A)
  blue:   '#2563EB',
};

export const SCORE_STYLE = {
  1:  { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },   // text stays readable red-600
  2:  { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },   // amber-700 text
  3:  { color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },   // green-700 text
  99: { color: C.muted,   bg: '#F4F4F5', border: C.rule },      // zinc-100 bg
};

export const CARD = {
  background: C.white,
  border: '1px solid rgba(0,0,0,0.06)',
  borderRadius: 12,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
};

export const FONT_WEIGHT = { normal: 400, medium: 500, semi: 600 };