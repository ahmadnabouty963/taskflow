export function BrandLogo({ className = "" }) {
  const classes = ["brand-wordmark", className].filter(Boolean).join(" ");

  return (
    <span aria-label="Ordanly" className={classes} role="img">
      <img
        alt=""
        aria-hidden="true"
        className="brand-wordmark__image brand-wordmark__image--light"
        src="/ordanly-logo.svg"
      />
      <img
        alt=""
        aria-hidden="true"
        className="brand-wordmark__image brand-wordmark__image--dark"
        src="/ordanly-logo-dark.svg"
      />
    </span>
  );
}
