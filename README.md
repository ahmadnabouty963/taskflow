# TaskFlow REST API

TaskFlow ist eine sichere REST-API zur Verwaltung persönlicher Projekte und Aufgaben.

Registrierte Benutzer:innen können eigene Projekte erstellen, Aufgaben organisieren, Status und Prioritäten verwalten sowie Aufgaben suchen, filtern und seitenweise abrufen. Alle geschützten Daten sind an den angemeldeten Benutzer gebunden.

## Projektstatus

Das Backend-MVP ist implementiert und wird aktuell für das Deployment vorbereitet.

- API lokal: `http://localhost:3000`
- Health-Endpoint: `http://localhost:3000/api/health`
- Live-API: Wird nach dem Deployment ergänzt
- Repository: https://github.com/ahmadnabouty963/taskflow

Der Ordner `apps/web` enthält einen frühen Frontend-Prototyp mit HTML, CSS und JavaScript. Dieser Prototyp verwendet aktuell noch `localStorage` und ist nicht Bestandteil des Backend-MVP.

## Entwickler

- Ahmad Nabouty

## Funktionen

- Registrierung und Login
- manuell implementierte Session-Authentifizierung
- Logout und Abruf des eigenen Benutzerprofils
- vollständiges CRUD für Projekte
- vollständiges CRUD für Aufgaben
- Aufgabenstatus: `TODO`, `IN_PROGRESS`, `DONE`
- Aufgabenprioritäten: `LOW`, `MEDIUM`, `HIGH`
- Suche in Aufgabentitel und Beschreibung
- Filterung nach Status und Priorität
- Pagination
- Eigentums- und Autorisierungsprüfung
- Validierung mit Zod
- einheitliche JSON-Fehlerantworten
- Security Header mit Helmet
- gezielte CORS-Konfiguration
- allgemeines und Auth-spezifisches Rate Limiting
- automatisierte Integrationstests
- separate PostgreSQL-Testdatenbank

## Technologie-Stack

### Backend

- Node.js
- Express
- PostgreSQL
- Prisma ORM
- Zod
- Argon2
- Cookie Parser
- Helmet
- CORS
- Express Rate Limit

### Tests

- Jest
- Supertest
- separate PostgreSQL-Testdatenbank

### Entwicklung

- JavaScript mit ECMAScript Modules
- Git und GitHub
- Prisma Migrations

## Projektstruktur

```text
taskflow/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── migrations/
│   │   │   └── schema.prisma
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── lib/
│   │   │   ├── middleware/
│   │   │   ├── routes/
│   │   │   ├── schemas/
│   │   │   ├── app.js
│   │   │   └── server.js
│   │   ├── tests/
│   │   ├── .env.example
│   │   ├── .env.test.example
│   │   └── package.json
│   └── web/
│       ├── index.html
│       ├── script.js
│       └── styles.css
├── docs/
│   └── PROJECT_PLAN.md
├── .gitignore
└── README.md
```

## Voraussetzungen

Für die lokale Ausführung werden benötigt:

- Node.js
- npm
- PostgreSQL
- Git

Die lokale Beispielkonfiguration verwendet PostgreSQL auf Port `5433`. Falls PostgreSQL auf einem anderen Port läuft, muss `DATABASE_URL` entsprechend angepasst werden.

## Lokale Installation

### 1. Repository klonen

```bash
git clone https://github.com/ahmadnabouty963/taskflow.git
cd taskflow/apps/api
```

### 2. Abhängigkeiten installieren

```bash
npm install
```

### 3. Entwicklungsdatenbank erstellen

Beispiel für PostgreSQL auf Port `5433`:

```bash
createdb -h localhost -p 5433 -U postgres taskflow
```

Falls die Datenbank bereits existiert, ist dieser Schritt nicht erforderlich.

### 4. Umgebungsdatei erstellen

```bash
cp .env.example .env
```

Danach muss in `.env` mindestens das korrekte PostgreSQL-Passwort eingetragen werden:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/taskflow?schema=public"
PORT=3000
NODE_ENV=development
CLIENT_ORIGINS=http://localhost:5500,http://localhost:5501
API_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_MAX=10
```

Die echte `.env`-Datei darf nicht in Git committed werden.

### 5. Prisma Client und Datenbankschema vorbereiten

```bash
npx prisma generate
npx prisma migrate deploy
```

### 6. Entwicklungsserver starten

```bash
npm run dev
```

Die API läuft anschließend unter:

```text
http://localhost:3000
```

Health-Check:

```bash
curl http://localhost:3000/api/health
```

Erwartete Antwort:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "taskflow-api"
  }
}
```

## Tests ausführen

### 1. Separate Testdatenbank erstellen

```bash
createdb -h localhost -p 5433 -U postgres taskflow_test
```

### 2. Testkonfiguration erstellen

```bash
cp .env.test.example .env.test
```

Danach das korrekte PostgreSQL-Passwort in `.env.test` eintragen.

Die Testdatenbank muss einen anderen Datenbanknamen als die Entwicklungsdatenbank verwenden:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5433/taskflow_test?schema=public"
```

### 3. Migrationen auf die Testdatenbank anwenden

```bash
node --env-file=.env.test node_modules/prisma/build/index.js migrate deploy
```

### 4. Tests starten

```bash
npm test
```

Aktuell umfasst die Testsuite 18 Integrationstests für:

- Health-Endpoint
- Authentifizierung
- Projekte
- Aufgaben
- Validierung
- Autorisierung
- Filterung, Suche und Pagination
- CORS und Security Header
- unbekannte Routen

## API-Übersicht

### System

| Methode | Endpoint      | Authentifizierung | Beschreibung           |
| ------- | ------------- | ----------------: | ---------------------- |
| GET     | `/api/health` |              Nein | Status der API abrufen |

### Authentifizierung

| Methode | Endpoint             | Authentifizierung | Beschreibung               |
| ------- | -------------------- | ----------------: | -------------------------- |
| POST    | `/api/auth/register` |              Nein | Benutzer registrieren      |
| POST    | `/api/auth/login`    |              Nein | Benutzer anmelden          |
| GET     | `/api/auth/me`       |                Ja | Aktuellen Benutzer abrufen |
| POST    | `/api/auth/logout`   |                Ja | Aktuelle Session beenden   |

### Projekte

| Methode | Endpoint                   | Authentifizierung | Beschreibung                  |
| ------- | -------------------------- | ----------------: | ----------------------------- |
| POST    | `/api/projects`            |                Ja | Projekt erstellen             |
| GET     | `/api/projects`            |                Ja | Eigene Projekte auflisten     |
| GET     | `/api/projects/:projectId` |                Ja | Eigenes Projekt abrufen       |
| PATCH   | `/api/projects/:projectId` |                Ja | Eigenes Projekt aktualisieren |
| DELETE  | `/api/projects/:projectId` |                Ja | Eigenes Projekt löschen       |

### Aufgaben

| Methode | Endpoint                                 | Authentifizierung | Beschreibung          |
| ------- | ---------------------------------------- | ----------------: | --------------------- |
| POST    | `/api/projects/:projectId/tasks`         |                Ja | Aufgabe erstellen     |
| GET     | `/api/projects/:projectId/tasks`         |                Ja | Aufgaben auflisten    |
| GET     | `/api/projects/:projectId/tasks/:taskId` |                Ja | Aufgabe abrufen       |
| PATCH   | `/api/projects/:projectId/tasks/:taskId` |                Ja | Aufgabe aktualisieren |
| DELETE  | `/api/projects/:projectId/tasks/:taskId` |                Ja | Aufgabe löschen       |

### Filter, Suche und Pagination

Der Endpoint zum Abrufen der Aufgaben unterstützt:

| Parameter  | Beispiel        | Beschreibung                      |
| ---------- | --------------- | --------------------------------- |
| `status`   | `TODO`          | Nach Status filtern               |
| `priority` | `HIGH`          | Nach Priorität filtern            |
| `search`   | `documentation` | In Titel und Beschreibung suchen  |
| `page`     | `1`             | Gewünschte Seite                  |
| `limit`    | `10`            | Ergebnisse pro Seite, maximal 100 |

Beispiel:

```http
GET /api/projects/{projectId}/tasks?status=TODO&priority=HIGH&search=documentation&page=1&limit=10
```

## API-Beispiele

### Benutzer registrieren

```bash
curl -i \
  -c taskflow-cookies.txt \
  -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ahmad",
    "email": "ahmad@example.com",
    "password": "StrongPass123"
  }'
```

Erfolgreiche Antwort: `201 Created`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e138993b-7fd5-433d-998d-09af54f88005",
      "name": "Ahmad",
      "email": "ahmad@example.com",
      "createdAt": "2026-10-01T11:49:50.198Z"
    }
  }
}
```

Das Passwort und der Passwort-Hash werden niemals zurückgegeben.

### Benutzer anmelden

```bash
curl -i \
  -c taskflow-cookies.txt \
  -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ahmad@example.com",
    "password": "StrongPass123"
  }'
```

### Aktuellen Benutzer abrufen

```bash
curl -i \
  -b taskflow-cookies.txt \
  http://localhost:3000/api/auth/me
```

### Projekt erstellen

```bash
curl -i \
  -b taskflow-cookies.txt \
  -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "title": "TaskFlow Backend",
    "description": "Backend module final project"
  }'
```

Erfolgreiche Antwort: `201 Created`

```json
{
  "success": true,
  "data": {
    "project": {
      "id": "e6a274f7-a1b8-4726-9285-a3c76c3f4857",
      "title": "TaskFlow Backend",
      "description": "Backend module final project",
      "ownerId": "e138993b-7fd5-433d-998d-09af54f88005",
      "createdAt": "2026-10-02T12:06:50.049Z",
      "updatedAt": "2026-10-02T12:06:50.049Z"
    }
  }
}
```

### Aufgabe erstellen

```bash
curl -i \
  -b taskflow-cookies.txt \
  -X POST \
  http://localhost:3000/api/projects/PROJECT_ID/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete API documentation",
    "description": "Document all endpoints and error responses",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "dueDate": "2026-10-06T18:00:00.000Z"
  }'
```

### Aufgaben filtern

```bash
curl -i \
  -b taskflow-cookies.txt \
  "http://localhost:3000/api/projects/PROJECT_ID/tasks?status=IN_PROGRESS&priority=HIGH&page=1&limit=10"
```

Beispiel einer paginierten Antwort:

```json
{
  "success": true,
  "data": {
    "tasks": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 0,
      "totalPages": 0
    }
  }
}
```

### Projekt aktualisieren

```bash
curl -i \
  -b taskflow-cookies.txt \
  -X PATCH \
  http://localhost:3000/api/projects/PROJECT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "title": "TaskFlow Production API"
  }'
```

### Projekt löschen

```bash
curl -i \
  -b taskflow-cookies.txt \
  -X DELETE \
  http://localhost:3000/api/projects/PROJECT_ID
```

Erfolgreiche Antwort: `204 No Content`

## Fehlerformat

Fehler verwenden eine einheitliche JSON-Struktur:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message."
  }
}
```

### Validierungsfehler

Status: `422 Unprocessable Entity`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request body contains invalid data.",
    "details": [
      {
        "field": "title",
        "message": "Task title is required."
      }
    ]
  }
}
```

### Nicht authentifiziert

Status: `401 Unauthorized`

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHENTICATED",
    "message": "Authentication is required."
  }
}
```

### Nicht gefunden

Status: `404 Not Found`

```json
{
  "success": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project not found."
  }
}
```

### Zu viele Anfragen

Status: `429 Too Many Requests`

Login und Registrierung werden durch ein strengeres Rate Limit geschützt.

## Authentifizierung und Autorisierung

TaskFlow verwendet eine selbst implementierte Session-Authentifizierung:

1. Passwörter werden mit Argon2id gehasht.
2. Bei Registrierung oder Login wird ein kryptografisch zufälliger Session-Token erzeugt.
3. In PostgreSQL wird nur der SHA-256-Hash des Tokens gespeichert.
4. Der rohe Token wird über ein `HttpOnly`-Cookie übertragen.
5. In Produktion wird das Cookie zusätzlich als `Secure` gesetzt.
6. Geschützte Routen prüfen Session und Ablaufzeit.
7. Datenbankabfragen prüfen zusätzlich den Besitzer des Projekts.

Benutzer:innen können ausschließlich auf ihre eigenen Projekte und Aufgaben zugreifen.

## Sicherheitsmaßnahmen

- Argon2id-Passwort-Hashing
- gehashte Session-Tokens
- `HttpOnly`- und Produktions-`Secure`-Cookies
- Zod-Validierung für Body, Parameter und Query
- JSON-Größenlimit von `10kb`
- Helmet Security Header
- gezielte CORS-Allowlist
- allgemeines API-Rate-Limit
- verschärftes Rate-Limit für Registrierung und Login
- keine Stacktraces oder internen Details in API-Antworten
- getrennte Entwicklungs- und Testdatenbanken
- Umgebungsvariablen für Zugangsdaten
- keine `.env`-Dateien im Repository
- HTTPS für die Produktions-API

## Dokumentation

Die ausführliche Projektplanung mit Datenmodell, ER-Diagramm, Sicherheitskonzept und Technologieentscheidungen befindet sich hier:

- [Projektplanung und ER-Diagramm](docs/PROJECT_PLAN.md)

Das Prisma-Datenmodell befindet sich hier:

- [Prisma Schema](apps/api/prisma/schema.prisma)

## Deployment

Die Produktions-URL wird nach dem Deployment hier ergänzt.

Vor dem Deployment müssen folgende Umgebungsvariablen gesetzt werden:

```env
DATABASE_URL=...
PORT=...
NODE_ENV=production
CLIENT_ORIGINS=...
API_RATE_LIMIT_MAX=...
AUTH_RATE_LIMIT_MAX=...
```

Anschließend müssen die Datenbankmigrationen ausgeführt und mindestens folgende Abläufe über HTTPS überprüft werden:

- Health-Check
- Registrierung
- Login und Session-Cookie
- Projekt-CRUD
- Task-CRUD
- Filterung und Pagination
- Autorisierung
- Logout

## Verfügbare npm-Skripte

Im Ordner `apps/api`:

```bash
npm run dev
npm start
npm test
```

## Lizenz

ISC
