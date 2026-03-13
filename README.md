# Dexii: Private Dating CRM & Sharing App

Dexii is a "digital little black book" designed for high-security, high-glamour tracking of your dating life. It prioritizes privacy and selective sharing between trusted friends.

## 🚀 Key Features

- **🔐 Secure Vault**: Protected by a 4-digit PIN with stealth mode themes.
- **🗂 The Rolodex**: Manage connections with detailed profiles, attraction ratings, and status tracking.
- **👥 Selective Sharing**: One-to-one sharing of "Tea" (Notes) and profiles with your inner circle.
- **💬 Secure Messaging**: End-to-end encrypted style chat with self-destructing message support.
- **💖 Safety First**: Built-in safety check-ins and red flag tracking for dates.
- **🔞 Photo Vault**: Restricted area for intimate content with unblur-on-hover protection.

## 🛠 Tech Stack

- **Frontend**: Angular 21 (Signals, Standalone Components, Tailwind CSS)
- **Backend**: Node.js, Express, MongoDB, Socket.io
- **Security**: PIN-based local locking, JWT-ready architecture.

## 📁 Project Structure

```text
├── src/app/
│   ├── core/           # Singleton services, models, and guards
│   │   ├── services/   # DataService, SecurityService, ThemeService, etc.
│   │   └── models/     # TypeScript interfaces for Crushes, Users, Entries
│   └── features/       # Functional modules (Dashboard, Profile, Vault, etc.)
├── server/             # Express.js backend API
├── docs/               # Project documentation and history
└── public/             # Static assets
```

## 🚦 Getting Started

### Prerequisites
- Node.js (v18+)
- Angular CLI

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd server && npm install
   ```

### Running the App

1. **Start the Backend**:
   ```bash
   cd server
   npm run dev
   ```

2. **Start the Frontend**:
   ```bash
   npm start
   ```

3. Navigate to `http://localhost:4200`. Default PIN: `1111`.

## 🗄️ Local Mongo + Deployment

- Local Mongo + hosting steps: `docs/local-mongo-and-hosting.md`
- Docker Mongo helper: `docker-compose.yml`
- Render config: `render.yaml`

## 📜 License
Private/Internal Use Only.
