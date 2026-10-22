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
          <li>vom Benutzer erstellte Projekte, Aufgaben, Termine und Whiteboards</li>
          <li>hochgeladene Dateien wie Bilder, PDFs und Office-Dokumente</li>
          <li>
            Zeitpunkt der letzten Anmeldung und Aktivität sowie Land, Gerätetyp
            und Browser der letzten Anmeldung
          </li>
          <li>E-Mail-Adressen und Rollen für Team-Einladungen</li>
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
          Abs. 1 lit. f DSGVO für Sicherheit und Missbrauchsprävention. Auf
          derselben Grundlage sehen Plattform-Administratoren eine Übersicht
          der Konten mit Registrierungsdatum, letzter Aktivität, Land und
          Gerätetyp sowie zusammengefasste Nutzungszahlen. Sie können Konten bei
          Missbrauch sperren oder löschen. Inhalte von Projekten, Aufgaben,
          Terminen und Dateien sind in dieser Übersicht nicht sichtbar.
        </p>
      </section>

      <section>
        <h2>4. Anmeldung und Session-Cookie</h2>
        <p>
          Nach erfolgreicher Anmeldung setzt Ordanly ein technisch notwendiges
          Session-Cookie. Es ist als HttpOnly, Secure und SameSite=Lax
          konfiguriert und wird nicht für Werbung oder Analyse verwendet.
        </p>
        <p>
          Bei jeder Anmeldung ermittelt Ordanly aus der IP-Adresse das Land und
          aus der Browserkennung den Gerätetyp und den Browser. Gespeichert
          werden nur das Land, der Gerätetyp und der Browser, nicht die
          IP-Adresse. Die Länderzuordnung erfolgt auf dem eigenen Server ohne
          Anfrage an Dritte und beruht auf Daten der Number Resource
          Organization (nro.net), lizenziert unter CC BY 4.0.
        </p>
      </section>

      <section>
        <h2>5. Hosting und Auftragsverarbeitung</h2>
        <p>
          Das Frontend wird über Vercel bereitgestellt. Die REST-API wird über
          Render betrieben und die PostgreSQL-Datenbank über Neon. Dabei können
          technisch notwendige Verbindungsdaten verarbeitet werden.
          Hochgeladene Dateien werden bei Cloudflare R2 mit Speicherort in der
          Europäischen Union gespeichert. Der Zugriff ist nur Mitgliedern des
          jeweiligen Arbeitsbereichs über zeitlich begrenzte Links möglich.
          Beim Löschen einer Aufgabe, eines Projekts oder des Kontos werden
          die zugehörigen Dateien ebenfalls gelöscht. Für
          internationale Datenübermittlungen gelten die Vereinbarungen und
          Schutzmechanismen der jeweiligen Anbieter.
        </p>
      </section>

      <section>
        <h2>6. Transaktions-E-Mails</h2>
        <p>
          Ordanly verwendet Resend für den Versand notwendiger E-Mails, etwa
          für Einladungen zu Team-Arbeitsbereichen. Hierfür werden insbesondere
          Empfängeradresse, Absenderinformationen und der Inhalt der jeweiligen
          Nachricht an Resend übermittelt. Einladungslinks sind zeitlich
          begrenzt und enthalten ein zufälliges, serverseitig nur gehasht
          gespeichertes Token.
        </p>
      </section>

      <section>
        <h2>7. Speicherdauer</h2>
        <p>
          Kontodaten, Projekte und Aufgaben werden grundsätzlich gespeichert,
          solange das Benutzerkonto besteht oder ihre Verarbeitung für die
          genannten Zwecke erforderlich ist. Sessions laufen automatisch ab
          oder werden beim Logout beendet. Gesetzliche Aufbewahrungspflichten
          bleiben unberührt.
        </p>
      </section>

      <section>
        <h2>8. Besucherstatistik ohne Cookies</h2>
        <p>
          Um die Website zu verbessern, zählt Ordanly Seitenaufrufe mit einer
          eigenen, datensparsamen Statistik. Es werden keine Cookies gesetzt und
          keine Daten im Browser gespeichert. Erfasst werden die aufgerufene
          Seite (ohne persönliche Links wie Einladungs- oder Passwort-Links),
          die Domain der verweisenden Website, das aus der IP-Adresse ermittelte
          Land sowie Gerätetyp und Browser.
        </p>
        <p>
          Damit ein Besucher an einem Tag nur einmal gezählt wird, bildet
          Ordanly aus IP-Adresse, Browserkennung und einem täglich neu erzeugten
          Zufallswert eine anonyme Prüfsumme. Der Zufallswert des Vortags wird
          gelöscht, sodass Besuche an verschiedenen Tagen nicht miteinander
          verknüpft und keiner Person zugeordnet werden können. Die IP-Adresse
          selbst wird nicht gespeichert. Ist im Browser „Do Not Track“ oder
          „Global Privacy Control“ aktiviert, wird der Besuch nicht gezählt.
        </p>
        <p>
          Die einzelnen Aufrufe werden nach zwölf Monaten gelöscht; danach
          bleiben nur Monatssummen ohne Einzelangaben erhalten. Rechtsgrundlage
          ist Art. 6 Abs. 1 lit. f DSGVO, das berechtigte Interesse an der
          Verbesserung des Angebots. Ordanly verwendet kein Werbetracking, keine
          personalisierte Werbung und keine Analysedienste Dritter.
        </p>
      </section>

      <section>
        <h2>9. Rechte betroffener Personen</h2>
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
        <h2>10. Sicherheit</h2>
        <p>
          Ordanly verwendet HTTPS, gehashte Passwörter, sichere Session-Cookies,
          serverseitige Validierung, Zugriffskontrollen und Rate Limits.
        </p>
      </section>

      <section>
        <h2>11. Änderungen</h2>
        <p>
          Diese Datenschutzerklärung wird aktualisiert, wenn sich Funktionen,
          Anbieter oder gesetzliche Anforderungen ändern.
        </p>
      </section>

      <p className="legal-updated">Stand: 22. Oktober 2026</p>
    </LegalLayout>
  );
}
