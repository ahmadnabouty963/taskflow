# Ordanly

Ordanly ist eine responsive Full-Stack-Webanwendung zur Verwaltung persönlicher Projekte und Aufgaben.

Registrierte Benutzer:innen können eigene Projekte erstellen, Aufgaben organisieren, Status und Prioritäten verwalten sowie Aufgaben suchen und filtern. Alle geschützten Daten sind an das angemeldete Benutzerkonto gebunden.

## Live-Anwendung

- Frontend: https://ordanly.com
- Frontend mit WWW: https://www.ordanly.com
- REST-API: https://api.ordanly.com
- API Health-Check: https://api.ordanly.com/api/health
- GitHub-Repository: https://github.com/ahmadnabouty963/taskflow

## Projektstatus

Das Full-Stack-MVP ist implementiert, getestet und öffentlich verfügbar.

Aktuell umgesetzt:

- Registrierung mit Name, E-Mail-Adresse und Passwort
- Login und Logout
- persistente Session-Authentifizierung mit sicherem Cookie
- geschützte Frontend-Routen
- vollständiges CRUD für Projekte
- vollständiges CRUD für Aufgaben
- persönliche und gemeinsame Team-Arbeitsbereiche
- Rollen `OWNER`, `ADMIN`, `MEMBER` und `VIEWER`
- sichere Team-Einladungen per E-Mail mit sieben Tagen Gültigkeit
- Aufgabenstatus: `TODO`, `IN_PROGRESS`, `DONE`
- Aufgabenprioritäten: `LOW`, `MEDIUM`, `HIGH`
- Suche in Aufgabentitel und Beschreibung
- Filterung nach Status und Priorität
- Pagination auf API-Ebene
- responsive Benutzeroberfläche für Desktop, Tablet und Smartphone
- Autorisierung und Trennung der Daten nach Benutzerkonto
- strukturierte Validierungs- und Fehlerantworten
- automatisierte Integrations- und Sicherheitstests
- Deployment mit eigener Domain und HTTPS

## Technologien

### Frontend

- React 19
- React Router
- Vite
- CSS
- Fetch API
- ESLint

### Backend

- Node.js
- Express 5
- Prisma ORM
- PostgreSQL
- Zod
- Argon2id
- Cookie Parser
- CORS
- Helmet
- Express Rate Limit

### Tests und Deployment

- Jest
- Supertest
- Vercel für das Frontend
- Render für die REST-API
- Neon PostgreSQL für die Produktionsdatenbank
- Git und GitHub

## Projektstruktur

```text
taskflow/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── lib/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   └── schemas/
│   │   └── tests/
│   ├── client/
│   │   ├── public/
│   │   └── src/
│   │       ├── components/
│   │       ├── context/
│   │       ├── lib/
│   │       └── pages/
│   └── web/
└── docs/
```

`apps/client` enthält das aktuelle React-Frontend. `apps/web` ist ein früher HTML-, CSS- und JavaScript-Prototyp und gehört nicht zur aktuellen Produktionsversion.

## Architektur

```mermaid
flowchart LR
    A[React Client] -->|HTTPS + JSON| B[Express REST API]
    B --> C[Prisma ORM]
    C --> D[PostgreSQL]
```

Das Frontend sendet HTTP-Anfragen an die REST-API. Express verarbeitet Routing, Authentifizierung, Validierung und Autorisierung. Prisma übernimmt den Datenbankzugriff auf PostgreSQL.

## Datenmodell

### User

- `id`
- `name`
- `email`
- `passwordHash`
- `createdAt`
- `updatedAt`

### Session

- `id`
- `tokenHash`
- `userId`
- `expiresAt`
- `createdAt`

### Project

- `id`
- `title`
- `description`
- `ownerId`
- `createdAt`
- `updatedAt`

### Task

- `id`
- `title`
- `description`
- `status`
- `priority`
- `dueDate`
- `projectId`
- `createdAt`
- `updatedAt`

## REST-API

### Health

| Methode | Endpoint | Beschreibung |
| --- | --- | --- |
| `GET` | `/api/health` | Status der API abrufen |

### Authentifizierung

| Methode | Endpoint | Beschreibung |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Benutzerkonto erstellen |
| `POST` | `/api/auth/login` | Benutzer anmelden |
| `GET` | `/api/auth/me` | Aktuell angemeldeten Benutzer abrufen |
| `POST` | `/api/auth/logout` | Session beenden |

### Projekte

| Methode | Endpoint | Beschreibung |
| --- | --- | --- |
| `POST` | `/api/projects` | Projekt erstellen |
| `GET` | `/api/projects` | Eigene Projekte auflisten |
| `GET` | `/api/projects/:projectId` | Einzelnes Projekt abrufen |
| `PATCH` | `/api/projects/:projectId` | Projekt bearbeiten |
| `DELETE` | `/api/projects/:projectId` | Projekt löschen |

### Aufgaben

| Methode | Endpoint | Beschreibung |
| --- | --- | --- |
| `POST` | `/api/projects/:projectId/tasks` | Aufgabe erstellen |
| `GET` | `/api/projects/:projectId/tasks` | Aufgaben auflisten |
| `GET` | `/api/projects/:projectId/tasks/:taskId` | Einzelne Aufgabe abrufen |
| `PATCH` | `/api/projects/:projectId/tasks/:taskId` | Aufgabe bearbeiten |
| `DELETE` | `/api/projects/:projectId/tasks/:taskId` | Aufgabe löschen |

Die Aufgabenliste unterstützt folgende Query-Parameter:

- `status`
- `priority`
- `search`
- `page`
- `limit`

Beispiel:

```text
GET /api/projects/:projectId/tasks?status=IN_PROGRESS&priority=HIGH&page=1&limit=10
```

## Authentifizierung und Sicherheit

Ordanly verwendet eine selbst implementierte Session-Authentifizierung.

1. Beim Login erzeugt der Server ein zufälliges Session-Token.
2. Das Original-Token wird als `HttpOnly`-Cookie an den Browser gesendet.
3. In der Datenbank wird ausschließlich der Hash des Tokens gespeichert.
4. Geschützte Endpoints prüfen die Session und den zugehörigen Benutzer.
5. Projekte und Aufgaben werden zusätzlich über die Benutzer-ID autorisiert.

Weitere Sicherheitsmaßnahmen:

- Passwörter werden mit Argon2id gehasht.
- Produktions-Cookies verwenden `HttpOnly` und `Secure`.
- Helmet setzt wichtige HTTP-Sicherheitsheader.
- CORS verwendet eine definierte Liste erlaubter Origins.
- Registrierung und Login besitzen ein verschärftes Rate-Limit.
- API-Anfragen besitzen ein allgemeines Rate-Limit.
- Request Body, URL-Parameter und Query-Parameter werden mit Zod validiert.
- Interne Fehler und Stacktraces werden nicht an Clients ausgegeben.
- Zugangsdaten werden ausschließlich über Umgebungsvariablen verwaltet.
- `.env`-Dateien werden nicht in Git gespeichert.

## Lokale Installation

### Voraussetzungen

- Node.js
- npm
- PostgreSQL
- Git

### Repository klonen

```bash
git clone https://github.com/ahmadnabouty963/taskflow.git
cd taskflow
```

### Backend einrichten

```bash
cd apps/api
npm install
cp .env.example .env
```

Beispiel für `apps/api/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/taskflow?schema=public"
PORT=3000
NODE_ENV=development
CLIENT_ORIGINS=http://localhost:5173,http://localhost:5500,http://localhost:5501
API_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
RESEND_API_KEY="re_your_resend_key"
EMAIL_FROM="Ordanly <hello@ordanly.com>"
CLIENT_APP_URL=http://localhost:5173
```

Datenbankmigrationen und Prisma Client:

```bash
npm run db:deploy
npm run build
```

Backend starten:

```bash
npm run dev
```

Die lokale API läuft anschließend unter:

```text
http://localhost:3000
```

### Frontend einrichten

In einem zweiten Terminal:

```bash
cd apps/client
npm install
cp .env.example .env
npm run dev
```

Beispiel für `apps/client/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Das lokale Frontend läuft standardmäßig unter:

```text
http://localhost:5173
```

## Verfügbare Skripte

### Backend: `apps/api`

```bash
npm run dev
npm start
npm run build
npm run db:deploy
npm test
```

### Frontend: `apps/client`

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Tests

Die Backend-Tests verwenden eine separate PostgreSQL-Testdatenbank.

```bash
cd apps/api
cp .env.test.example .env.test
npm test
```

Aktueller Stand:

- 5 Test-Suites
- 18 automatisierte Tests
- Authentifizierung
- Projekt-CRUD
- Task-CRUD
- Autorisierung und Datenisolation
- Validierung und Fehlerantworten
- Security Header und CORS
- Rate Limiting
- unbekannte API-Routen

Vor dem Testlauf müssen die Migrationen auch auf die Testdatenbank angewendet werden.

## Deployment

### Frontend

- Plattform: Vercel
- Live-Domain: https://ordanly.com
- WWW-Domain: https://www.ordanly.com
- Framework: React mit Vite
- Root Directory: `apps/client`
- Produktionsvariable: `VITE_API_URL=https://api.ordanly.com`

Vercel erstellt bei Änderungen auf dem Branch `main` automatisch ein neues Deployment.

### Backend

- Plattform: Render
- Live-API: https://api.ordanly.com
- Root Directory: `apps/api`
- Produktionsdatenbank: Neon PostgreSQL

Build-Befehl:

```bash
npm ci && npm run build
```

Start-Befehl:

```bash
npm run db:deploy && npm start
```

Die Produktionsumgebung verwendet unter anderem:

```env
DATABASE_URL=...
NODE_ENV=production
CLIENT_ORIGINS=...
API_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
RESEND_API_KEY=...
EMAIL_FROM="Ordanly <hello@ordanly.com>"
CLIENT_APP_URL=https://ordanly.com
```

`DATABASE_URL` enthält vertrauliche Zugangsdaten und wird nicht im Repository gespeichert. `PORT` wird von Render automatisch bereitgestellt.

Der kostenlose Render Web Service kann nach längerer Inaktivität herunterfahren. Deshalb kann die erste API-Anfrage kurzzeitig länger dauern.

## Produktionsprüfung

Am 19.10.2026 wurden folgende Abläufe über die öffentliche Anwendung erfolgreich geprüft:

- Aufruf von `ordanly.com` und `www.ordanly.com` über HTTPS
- Registrierung über das React-Frontend
- automatischer Login nach der Registrierung
- Wiederherstellung der Session nach einem Seiten-Reload
- Zugriffsschutz für `/app`
- Projekterstellung, Projektbearbeitung und Projektlöschung
- Task-Erstellung, Task-Bearbeitung und Task-Löschung
- persistente Speicherung in der Produktionsdatenbank
- Logout und Ungültigmachung der Session
- CORS-Verbindung zwischen Frontend und API

## Geplante Erweiterungen

Diese Funktionen gehören nicht zum aktuellen MVP und sind für spätere Versionen vorgesehen:

- E-Mail-Bestätigung
- Passwort-zurücksetzen-Funktion
- Login mit Google und GitHub
- Progressive Web App
- optionale native App

## Dokumentation

Die ausführliche Projektplanung mit Datenmodell, Sicherheitskonzept und technischen Entscheidungen befindet sich unter:

- [Projektplanung](docs/PROJECT_PLAN.md)
- [Prisma Schema](apps/api/prisma/schema.prisma)

## Entwickler

Ahmad Nabouty

## Lizenz

ISC
