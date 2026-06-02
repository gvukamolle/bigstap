export default function BigstepLogo() {
  return (
    <div
      aria-label="Grushko Stepan"
      style={{
        alignItems: 'center',
        color: '#000000',
        display: 'inline-flex',
        fontSize: 22,
        gap: 12,
        fontWeight: 800,
        letterSpacing: 0,
        lineHeight: 1,
        textTransform: 'none'
      }}
    >
      <img
        src="/logo-mark.png"
        alt=""
        aria-hidden
        style={{ display: 'block', height: 42, objectFit: 'contain', width: 42 }}
      />
      <span>Grushko Stepan</span>
    </div>
  )
}
