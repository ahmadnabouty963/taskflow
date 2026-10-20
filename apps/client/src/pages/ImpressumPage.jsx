import { LegalLayout } from "../components/LegalLayout.jsx";

export function ImpressumPage() {
  return (
    <LegalLayout
      eyebrow="Legal information"
      title="Impressum"
      intro="Information about the person responsible for the Ordanly website."
    >
      <section className="legal-notice" aria-labelledby="project-status-title">
        <h2 id="project-status-title">Project status</h2>
        <p>
          Ordanly is currently a non-commercial educational graduation project.
          A complete serviceable business address will be added before any
          commercial operation begins.
        </p>
      </section>

      <section>
        <h2>Provider information</h2>
        <address>
          <strong>Ahmad Nabouti</strong>
          <span>Ordanly</span>
          <span>
            Email:{" "}
            <a href="mailto:hello@ordanly.com">hello@ordanly.com</a>
          </span>
          <span>
            Website:{" "}
            <a href="https://ordanly.com">https://ordanly.com</a>
          </span>
        </address>
      </section>

      <section>
        <h2>Responsible for the content</h2>
        <p>Ahmad Nabouti</p>
      </section>

      <section>
        <h2>Liability notice</h2>
        <p>
          The content of this educational project was created with care.
          Nevertheless, no guarantee is given for completeness, accuracy or
          permanent availability.
        </p>
      </section>

      <p className="legal-updated">Last updated: 20 October 2026</p>
    </LegalLayout>
  );
}
