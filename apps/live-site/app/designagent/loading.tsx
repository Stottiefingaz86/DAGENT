/** Design agent — don’t flash BetOnline homepage ShellFrame skeleton. */
export default function DesignAgentLoading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200000,
        background: 'var(--colors-neutral-950)',
      }}
      aria-busy
      aria-label="Loading"
    />
  )
}
