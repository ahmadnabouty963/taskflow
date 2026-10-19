import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="not-found-page">
      <Link className="brand" to="/">
        <span className="brand-logo">O</span>
        <span>Ordanly</span>
      </Link>

      <div>
        <p className="eyebrow">Error 404</p>
        <h1>This page does not exist.</h1>
        <p>The address may be incorrect, or the page may have been moved.</p>
        <Link className="button button--dark" to="/">
          Return home
        </Link>
      </div>
    </main>
  );
}
