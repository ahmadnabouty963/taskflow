import { LegalLayout } from "../components/LegalLayout.jsx";

export function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Privacy"
      title="Datenschutzerklärung"
      intro="This page explains which personal data Ordanly processes and why."
    >
      <section>
        <h2>1. Verantwortlicher</h2>
        <address>
          <strong>Ahmad Nabouti</strong>
          <span>Ordanly</span>
          <span>
            E-Mail:{" "}
            <a href="mailto:hello@ordanly.com">hello@ordanly.com</a>
          </span>
        </address>
        <p>
          Eine ladungsfähige Geschäftsanschrift wird vor Aufnahme des
          kommerziellen Betriebs ergänzt.
        </p>
      </section>

      <section>
        <h2>2. Welche Daten verarbeitet werden</h2>
        <p>Bei der Nutzung von Ordanly können folgende Daten verarbeitet werden:</p>
        <ul>
          <li>Name und E-Mail-Adresse des Benutzerkontos</li>
          <li>sicher gehashter Passwortwert</li>
          <li>Session- und Anmeldedaten</li>
          <li>vom Benutzer erstellte Projekte und Aufgaben</li>
          <li>technische Verbindungs- und Sicherheitsdaten</li>
        </ul>
      </section>

      <section>
        <h2>3. Zwecke und Rechtsgrundlagen</h2>
        <p>
          Die Daten werden zur Bereitstellung des Benutzerkontos, zur
          Speicherung der Projekte und Aufgaben sowie zur Absicherung der
          Anwendung verarbeitet. Rechtsgrundlagen sind insbesondere Art. 6
          Abs. 1 lit. b DSGVO für die Bereitstellung der Anwendung und Art. 6
          Abs. 1 lit. f DSGVO für Sicherheit und Missbrauchsprävention.
        </p>
      </section>

      <section>
        <h2>4. Anmeldung und Session-Cookie</h2>
        <p>
          Nach erfolgreicher Anmeldung setzt Ordanly ein technisch notwendiges
          Session-Cookie. Es ist als HttpOnly, Secure und SameSite=Lax
          konfiguriert und wird nicht für Werbung oder Analyse verwendet.
        </p>
      </section>

      <section>
        <h2>5. Hosting und Auftragsverarbeitung</h2>
        <p>
          Das Frontend wird über Vercel bereitgestellt. Die REST-API wird über
          Render betrieben und die PostgreSQL-Datenbank über Neon. Dabei können
          technisch notwendige Verbindungsdaten verarbeitet werden. Für
          internationale Datenübermittlungen gelten die Vereinbarungen und
          Schutzmechanismen der jeweiligen Anbieter.
        </p>
      </section>

      <section>
        <h2>6. Speicherdauer</h2>
        <p>
          Kontodaten, Projekte und Aufgaben werden grundsätzlich gespeichert,
          solange das Benutzerkonto besteht oder ihre Verarbeitung für die
          genannten Zwecke erforderlich ist. Sessions laufen automatisch ab
          oder werden beim Logout beendet. Gesetzliche Aufbewahrungspflichten
          bleiben unberührt.
        </p>
      </section>

      <section>
        <h2>7. Keine Analyse- oder Werbe-Cookies</h2>
        <p>
          Ordanly verwendet derzeit keine Webanalyse, kein Werbetracking und
          keine personalisierte Werbung.
        </p>
      </section>

      <section>
        <h2>8. Rechte betroffener Personen</h2>
        <p>
          Betroffene Personen haben im Rahmen der gesetzlichen Voraussetzungen
          insbesondere das Recht auf Auskunft, Berichtigung, Löschung,
          Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch.
          Anfragen können an{" "}
          <a href="mailto:hello@ordanly.com">hello@ordanly.com</a> gerichtet
          werden.
        </p>
        <p>
          Zusätzlich besteht ein Beschwerderecht bei einer zuständigen
          Datenschutzaufsichtsbehörde.
        </p>
      </section>

      <section>
        <h2>9. Sicherheit</h2>
        <p>
          Ordanly verwendet HTTPS, gehashte Passwörter, sichere Session-Cookies,
          serverseitige Validierung, Zugriffskontrollen und Rate Limits.
        </p>
      </section>

      <section>
        <h2>10. Änderungen</h2>
        <p>
          Diese Datenschutzerklärung wird aktualisiert, wenn sich Funktionen,
          Anbieter oder gesetzliche Anforderungen ändern.
        </p>
      </section>

      <p className="legal-updated">Stand: 20. Oktober 2026</p>
    </LegalLayout>
  );
}
