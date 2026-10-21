import { BrandLogo } from "../components/BrandLogo.jsx";
import { Link } from "react-router";
import { useLanguage } from "../context/language-context.js";

export function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <main className="not-found-page">
      <Link className="brand" to="/">
        <BrandLogo />
      </Link>

      <div>
        <p className="eyebrow">{t("notFound.eyebrow")}</p>
        <h1>{t("notFound.title")}</h1>
        <p>{t("notFound.copy")}</p>
        <Link className="button button--dark" to="/">
          {t("notFound.home")}
        </Link>
      </div>
    </main>
  );
}
