const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export const BUTTON = {
  primary: `${BUTTON_BASE} bg-primary text-white hover:bg-primary-dark`,
  secondary: `${BUTTON_BASE} bg-surface-muted text-ink hover:bg-line`,
  danger: `${BUTTON_BASE} bg-danger text-white hover:bg-danger/90`,
  ghost: `${BUTTON_BASE} text-ink-secondary hover:bg-surface-muted hover:text-ink`,
} as const;

export const INPUT =
  "w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-primary";

export const FIELD_LABEL = "flex min-w-0 flex-col gap-1.5 text-xs font-medium text-ink-secondary";

/** Small rounded square holding an outline icon, as in the Figma status cards. */
export const ICON_BOX = "flex h-9 w-9 shrink-0 items-center justify-center rounded-md";
