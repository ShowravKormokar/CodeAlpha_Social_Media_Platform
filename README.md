# Social Media Platform

A full-stack mini social media platform built with **HTML, CSS, Vanilla JavaScript, Node.js, Express.js, and PostgreSQL**.

This project was developed as **Task 02 of the CodeAlpha Full Stack Software Development Internship**.

The original assignment focuses on users, profiles, posts, comments, likes, and follows. Instead of implementing only the minimum requirements, this project was developed with a stronger engineering mindset around **security, maintainability, data consistency, modular architecture, validation, pagination, transactions, and scalable design**.

> The goal is not to claim production-scale infrastructure. The goal is to demonstrate how a small application can be designed with principles that make future scaling easier.

---

## ✨ Features

### 🔐 Authentication & Authorization

- User registration
- Login / logout
- Current-user session
- Password hashing with bcrypt
- JWT-based authentication
- Access / refresh token mechanism
- HTTP-only authentication cookies
- Secure cookie configuration
- Authentication middleware
- Authorization and ownership checks
- Rate limiting on sensitive endpoints
- Input validation

Authentication credentials are intentionally **not stored in `localStorage` or `sessionStorage`**.

---

### 👤 User Profiles

- View user profiles
- Edit profile information
- Profile picture
- Profile banner
- Follower count
- Following count
- User posts
- Follow / unfollow state
- Followers and following
- User search

---

### 📝 Posts

- Create posts
- Edit own posts
- Delete own posts
- View posts
- Personalized feed
- Pagination
- Infinite scrolling
- Optional post images
- Post ownership validation
- Post metadata
- Like and comment counts

---

### 💬 Comments

- Create comments
- View comments
- Update own comments
- Delete own comments
- Comment counts
- Comment ownership validation

The current implementation keeps comments intentionally simple and maintainable rather than introducing unnecessary nested-comment complexity.

---

### ❤️ Likes

- Like a post
- Unlike a post
- Like count
- Current-user like state
- Duplicate-like protection

The database enforces uniqueness for a user/post relationship:

```text
UNIQUE(user_id, post_id)
````

This means application logic is not the only protection against duplicate likes.

---

### 🤝 Follow System

* Follow users
* Unfollow users
* Followers
* Following
* Follow state
* Mutual relationship information
* Follower counts
* Following counts
* Self-follow prevention
* Duplicate-follow prevention

The database also protects the relationship:

```text
UNIQUE(follower_id, following_id)
```

---

# 🖼️ Secure Image & Media System

One of the project's main engineering additions is a reusable image-management system.

Images can be used for:

* Profile pictures
* Profile banners
* Post images

The system was designed around the principle:

> **Never trust user-uploaded files.**

A file called `photo.jpg` is not automatically a safe image.

### Upload pipeline

```text
User
  │
  ▼
Frontend Upload UI
  │
  ├── File type check
  ├── File size check
  └── Image preview
  │
  ▼
Express API
  │
  ▼
Multer
  │
  ▼
Server-side validation
  │
  ▼
Sharp
  │
  ├── Decode image
  ├── Validate image
  ├── Resize when required
  ├── Strip metadata
  └── Re-encode
  │
  ▼
Safe generated storage key
  │
  ▼
Local Media Storage
  │
  ▼
PostgreSQL Media Metadata
```

### Security measures

The media system includes:

* Supported-format allowlist
* JPEG / PNG / WebP support
* File-size limits
* Server-side file validation
* Actual image decoding
* Sharp-based re-encoding
* Metadata stripping
* Server-generated UUID storage keys
* Path traversal protection
* No user-controlled filesystem paths
* No original filenames used as storage paths
* Uploaded files stored outside application source code
* Uploaded files are not served as executable application content
* Ownership validation
* Controlled media serving
* PostgreSQL stores metadata rather than binary image data

### Media architecture

```text
Profile / Post
      │
      ▼
  MediaService
      │
      ▼
StorageProvider
      │
      ▼
LocalStorageProvider
```

The application stores a `storage_key` rather than coupling business logic to a physical filesystem path.

This allows the storage implementation to evolve later:

```text
StorageProvider
   ├── LocalStorageProvider
   └── S3 / Cloudflare R2 (future)
```

### Media database concept

```text
media
├── id
├── owner_id
├── media_type
├── storage_key
├── mime_type
├── size
├── width
├── height
├── created_at
└── updated_at
```

PostgreSQL stores the **relationship and metadata**.

The actual image remains in media storage.

---

## 🧩 Image Upload Experience

The frontend provides a reusable upload experience for different media types.

```text
Select image
     ↓
Preview
     ↓
Upload
     ↓
Uploading 45%
     ↓
Processing & verifying
     ↓
Completed
```

Supported interactions include:

* Click to upload
* Drag and drop
* Image preview
* File information
* Upload progress
* Processing state
* Success state
* Error state
* Retry
* Cancel/remove
* Responsive modal
* Keyboard accessibility

The same upload mechanism is reused for:

```text
Profile Picture
Profile Banner
Post Image
```

Frontend validation improves UX, while **backend validation remains the security boundary**.

---

# 🏗️ Architecture

The project uses a layered and modular backend architecture.

```text
Client
  │
  ▼
REST API
  │
  ▼
Routes
  │
  ▼
Middleware
  │
  ├── Authentication
  ├── Authorization
  ├── Validation
  └── Security
  │
  ▼
Controllers
  │
  ▼
Services
  │
  ▼
Repositories
  │
  ▼
PostgreSQL
```

Supporting infrastructure includes:

```text
Configuration
Database
Migrations
Validation
Error Handling
Logging
Authentication
Storage
Media Processing
Testing
```

The frontend is intentionally kept framework-free:

```text
HTML
  ↓
CSS
  ↓
Vanilla JavaScript
  ↓
REST API
```

This keeps the project focused on understanding the underlying web architecture rather than hiding complexity behind a frontend framework.

---

# 🛠️ Technology Stack

## Frontend

* HTML5
* CSS3
* Vanilla JavaScript
* Fetch API
* Remix Icon

## Backend

* Node.js
* Express.js
* JavaScript
* REST API

## Database

* PostgreSQL
* `pg`

PostgreSQL was selected because the application's data is highly relational:

```text
Users
 ├── Posts
 │    ├── Comments
 │    └── Likes
 │
 └── Followers / Following
```

The project therefore benefits from:

* Foreign keys
* Unique constraints
* Transactions
* JOINs
* Indexes
* Referential integrity
* Connection pooling
* Relational consistency

## Authentication & Security

* JWT
* HTTP-only cookies
* bcrypt
* Helmet
* CORS
* Rate limiting
* Input validation

## Image Processing

* Multer
* Sharp

## Infrastructure

* Docker
* Docker Compose
* Nginx
* PostgreSQL container

---

# 🔒 Security & Engineering Principles

Security was treated as a cross-cutting concern rather than something added only at the end.

### Authentication

* HTTP-only cookies
* Secure cookies in production
* SameSite protection
* Password hashing
* Access/refresh authentication
* Authentication middleware

### Authorization

The server determines ownership.

For example:

```text
Client → "I want to edit user 123"
             ↓
Server checks authenticated user
             ↓
Server verifies ownership
             ↓
Allow / Reject
```

The frontend is never treated as the authority for permissions.

### Input Validation

User-controlled input is validated before reaching business logic.

### Database Integrity

Important relationships are protected with:

* Foreign keys
* Unique constraints
* Transactions
* Appropriate indexes

### SQL Safety

Database access uses parameterized queries rather than directly concatenating user input into SQL.

### Image Safety

Uploaded images are:

```text
Validated
   ↓
Decoded
   ↓
Processed
   ↓
Re-encoded
   ↓
Stored safely
```

The system does not rely only on a `.jpg` extension or browser-provided MIME type.

---

# ⚡ Performance Considerations

The project applies several practical performance principles:

* PostgreSQL connection pooling
* Database indexes
* Pagination
* Infinite scrolling
* Efficient joins
* Query projections
* Avoiding unnecessary N+1 queries
* Server-side pagination
* Optimized image dimensions
* Lazy image loading where appropriate
* Controlled upload sizes

The architecture is intentionally designed so performance optimizations can be introduced without rewriting the entire application.

---

# 🔄 Data Consistency

A major engineering focus is keeping related operations consistent.

For example, a follow operation should not simply depend on frontend state.

```text
User clicks Follow
       ↓
Backend authentication
       ↓
Validate target
       ↓
Check business rules
       ↓
Database constraint
       ↓
Create relationship
       ↓
Return authoritative state
```

Similarly, likes and follows use database-level uniqueness to protect against concurrent duplicate requests.

For operations involving multiple related database changes, transactions are used where atomicity is required.

---

# 🐳 Docker

The complete application can be started using Docker Compose.

### Requirements

```text
Docker Engine 24+
Docker Compose v2
```

### Start

```bash
cp .env.example .env
docker compose up -d
```

On Windows:

```powershell
copy .env.example .env
docker compose up -d
```

### Services

| Service  | URL                            |
| -------- | ------------------------------ |
| Frontend | `http://localhost:5500`        |
| API      | `http://localhost:5000`        |
| Health   | `http://localhost:5000/health` |
| API v1   | `http://localhost:5000/api/v1` |

### Startup flow

```text
PostgreSQL
    ↓
Health Check
    ↓
Database Migration
    ↓
Express API
    ↓
Frontend
```

The API waits for the database and migration process before starting.

### Common commands

```bash
# Start
docker compose up -d

# Start and rebuild
docker compose up -d --build

# View services
docker compose ps

# View logs
docker compose logs -f

# API logs
docker compose logs -f api

# Stop
docker compose down

# Stop and remove database volume
# WARNING: destroys development database data
docker compose down -v
```

### Tests

```bash
docker compose run --rm api npm test
```

---

# ⚙️ Configuration

Configuration is environment-based.

Create:

```text
.env
```

from:

```text
.env.example
```

Important configuration includes:

```env
FRONTEND_PORT=5500
API_PORT=5000

POSTGRES_DB=social_media
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

CORS_ORIGIN=http://localhost:5500

JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me

MEDIA_STORAGE_PROVIDER=local
MEDIA_UPLOAD_DIR=/app/storage/uploads
MEDIA_MAX_FILE_SIZE=8388608
```

> Never use development secrets in a real deployment.

Uploaded media is stored in a dedicated Docker volume outside the application source directory and is served through the API rather than exposed as static application content.

---

# 🗄️ Database

The project uses PostgreSQL with migration-based schema management.

Core relationships include:

```text
users
  │
  ├── profiles
  ├── posts
  │     ├── comments
  │     ├── likes
  │     └── media
  │
  ├── followers / following
  │
  └── media
```

Database design emphasizes:

* Normalization
* Foreign keys
* Unique constraints
* Indexes
* Transactions
* Referential integrity
* Consistent relationships

---

# 🧪 Testing

Testing focuses on business rules and security-sensitive behavior.

Areas include:

* Authentication
* Authorization
* User operations
* Posts
* Comments
* Likes
* Follows
* Validation
* Database behavior
* Media uploads
* Image validation
* Image processing
* Ownership checks
* Error handling

Run:

```bash
npm test
```

or through Docker:

```bash
docker compose run --rm api npm test
```

---

# 📁 Project Structure

The exact structure may evolve, but the project is organized around clear application responsibilities.

```text
CodeAlpha_Social_Media_Platform/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validation/
│   │   └── ...
│   │
│   ├── docs/
│   │   └── IMAGEPLAN.md
│   │
│   ├── tests/
│   └── ...
│
├── frontend/
│   ├── css/
│   ├── js/
│   ├── pages/
│   └── ...
│
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .dockerignore
├── .gitignore
└── README.md
```

The implementation follows separation of concerns rather than placing all application logic inside route handlers.

---

# 🔌 API

API versioning begins at:

```text
/api/v1
```

Typical resource groups include:

```text
/api/v1/auth
/api/v1/users
/api/v1/posts
/api/v1/comments
/api/v1/likes
/api/v1/follows
/api/v1/media
```

The exact available endpoints should be treated according to the current backend implementation and API documentation.

---

# 🖼️ Media API

Image uploads are handled through:

```text
POST /api/v1/media
```

using:

```text
multipart/form-data
```

Supported media purposes:

```text
profile_avatar
profile_banner
post_image
```

The backend determines the authenticated owner from the authentication context.

The client does not control:

```text
owner_id
storage path
filesystem location
```

---

# 🚀 Development Without Docker

Docker is optional.

The project can also be run directly using Node.js and PostgreSQL.

Requirements:

```text
Node.js >= 20
npm >= 10
PostgreSQL >= 16
Git
Modern browser
```

Install backend dependencies:

```bash
cd backend
npm install
```

Configure:

```text
backend/.env
```

Then run the migration system and start the backend according to the project's npm scripts.

Start the frontend using the project's configured static server/development workflow.

---

# 🌱 Seed Data

Development seed data can be executed explicitly.

With Docker:

```bash
docker compose run --rm migrate npm run db:seed
```

Seeding is intentionally not automatic during normal startup.

This avoids unexpectedly modifying development data every time the application starts.

---

# 📌 Engineering Decisions

This project intentionally demonstrates several practical engineering decisions.

### Why PostgreSQL?

Because the domain contains many relational relationships and requires strong consistency.

### Why Vanilla JavaScript?

To understand browser APIs, DOM manipulation, HTTP communication, state handling, and frontend architecture without depending on a framework.

### Why layered Express architecture?

To separate:

```text
HTTP concerns
Business logic
Data access
Infrastructure
```

### Why database constraints?

Because application-level checks alone are insufficient when concurrent requests can reach the database.

### Why HTTP-only cookies?

To keep authentication credentials inaccessible to normal JavaScript APIs and reduce exposure to common client-side token theft scenarios.

### Why image sanitization?

Because uploaded files are untrusted input.

A filename such as:

```text
profile.jpg
```

does not prove that the underlying file is a safe image.

The server therefore validates and processes images before storing them.

### Why storage abstraction?

The MVP uses local storage, but business logic should not depend on a local filesystem.

This keeps the migration path toward:

```text
Local Storage
      ↓
S3 / Cloudflare R2 / Object Storage
```

open without rewriting profile and post business logic.

---

# 🧭 Future Improvements

The current project intentionally stops at an MVP-sized architecture.

Possible future improvements include:

* S3 / Cloudflare R2 object storage
* CDN-backed media delivery
* Background media processing
* Antivirus/malware scanning pipeline
* Image moderation
* Multiple optimized image variants
* WebP/AVIF delivery
* Video uploads
* Private media access
* Notifications infrastructure
* Redis caching
* Advanced feed ranking
* Search indexing
* WebSocket-based real-time updates
* Observability and metrics
* Automated CI/CD
* Production deployment

These are intentionally kept outside the current scope so the core architecture remains understandable and maintainable.

---

# 🎯 Project Scope

This project is intentionally a **mini social platform**, not a production-scale social network.

The focus is on demonstrating practical understanding of:

* Full-stack development
* REST API design
* Authentication
* Authorization
* PostgreSQL
* Relational modeling
* Transactions
* Data consistency
* Security
* Image/file handling
* Input validation
* Modular architecture
* Pagination
* Testing
* Docker
* Maintainability
* Future scalability

---

# 📚 Documentation

Additional technical documentation:

* `backend/docs/IMAGEPLAN.md` — image/media architecture and implementation plan

The repository also contains the project's migrations, configuration examples, tests, and Docker configuration.

---

# 👨‍💻 Author

**Showrav Kormokar**

Computer Science & Engineering

Interested in:

* Software Engineering
* Backend Engineering
* Distributed Systems
* System Design
* Database Architecture
* Security
* AI-powered applications

---

# 🏁 Final Status

**CodeAlpha Full Stack Software Development Internship — Task 02**

The project started as a simple social-media assignment and was developed into a structured full-stack application with a stronger focus on real-world engineering practices.

The final implementation includes:

```text
Authentication
      +
Profiles
      +
Posts
      +
Comments
      +
Likes
      +
Follow System
      +
Search
      +
Personalized Feed
      +
Pagination
      +
Secure Image Upload
      +
Image Validation & Sanitization
      +
Media Storage Abstraction
      +
PostgreSQL
      +
Docker
      +
Testing
      +
Security & Data Consistency
```

> **Built as an internship project, designed with engineering principles that can support future evolution.**

```
