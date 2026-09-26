# Social Media Platform

A mini full-stack social media platform built with **HTML, CSS, JavaScript, Express.js, and PostgreSQL**.

The project starts from a simple social-media assignment—users, profiles, posts, comments, likes, and follows—but is designed with **intermediate-level implementation and senior-level engineering principles** in mind.

The goal is not to build a production-scale social network. Instead, this project provides a strong foundation that can evolve toward one by applying clean architecture, modular design, secure authentication, relational data modeling, transactional consistency, validation, pagination, centralized error handling, testing, and API versioning.

---

## 1. What Is This Project?

The **Social Media Platform** is a web application where users can:

* Create an account and authenticate securely.
* Manage their profile.
* Create, edit, and delete posts.
* View posts from other users.
* Like and unlike posts.
* Comment on posts.
* Follow and unfollow other users.
* View followers and following lists.
* View user profiles and their posts.
* Browse a personalized feed.
* Search for users and posts.
* Receive basic notifications for social interactions.

The application is divided into two independently structured applications:

```text
CodeAlpha_Social_Media_Platform/
├── backend/
└── frontend/
```

The frontend communicates with the backend exclusively through a RESTful API.

---

# 2. Objective

The primary objective is to build a **maintainable and extensible social-media application** while practicing real-world software engineering concepts.

### Core objectives

* Build a complete full-stack application.
* Design a normalized relational database.
* Implement secure authentication.
* Implement authorization and ownership checks.
* Design clean REST APIs.
* Practice modular Express.js architecture.
* Use transactions where multiple database operations must succeed or fail together.
* Implement cursor/offset pagination where appropriate.
* Implement centralized error handling.
* Separate controllers, services, repositories, models, validation, and routes.
* Write unit, integration, and API tests.
* Establish consistent API response formats.
* Prepare the architecture for future scaling.

### Engineering objectives

The project should demonstrate understanding of:

* Separation of concerns.
* Dependency inversion.
* DRY principles.
* SOLID principles where appropriate.
* Database normalization.
* Indexing.
* Transactions.
* Connection pooling.
* Authentication vs authorization.
* API versioning.
* Input validation.
* Rate limiting.
* Security headers.
* Logging and observability.
* Testing.
* Configuration management.
* Database migrations.
* Seed data.
* Graceful error handling.

---

# 3. Features

The original assignment requires:

> User profiles, posts & comments, and like/follow system.

The project expands these into a more complete social-media foundation.

---

## 3.1 Authentication

### Registration

Users can create an account using:

* Name
* Username
* Email
* Password

Requirements:

* Email must be unique.
* Username must be unique.
* Password must never be stored as plaintext.
* Password must be hashed using `bcrypt`.
* Input must be validated.
* Duplicate accounts must return appropriate errors.

### Login

Users authenticate using:

```text
Email/Username + Password
```

Authentication is handled using **HTTP-only cookies**.

The frontend must not store authentication tokens in:

```text
localStorage
sessionStorage
```

### Logout

Logout should:

* Invalidate the authentication session/token.
* Clear the authentication cookie.
* Return a successful response.

### Authentication requirements

* HTTP-only cookie
* Secure cookie in production
* SameSite protection
* Password hashing
* Authentication middleware
* Authorization middleware
* Rate limiting on authentication endpoints

---

# 3.2 User Profiles

Each user has a profile containing:

* Profile picture
* Cover image
* Display name
* Username
* Bio
* Website
* Location
* Joined date

Profile functionality:

* View profile
* Edit profile
* Change profile picture
* Change password
* View user's posts
* View follower count
* View following count
* Follow/unfollow user

Future extension:

* Account privacy
* Private profiles
* Profile verification
* User blocking

---

# 3.3 Posts

Authenticated users can create posts.

A post may contain:

* Text content
* Optional image
* Created timestamp
* Updated timestamp
* Author

Operations:

```text
Create post
Get post
Get posts
Update own post
Delete own post
```

Users must only be able to modify or delete their own posts unless an administrative permission exists.

### Post metadata

Each post should expose:

```text
author
createdAt
updatedAt
likeCount
commentCount
```

Counts should not require inefficient queries for every individual post.

---

# 3.4 Comments

Users can comment on posts.

Operations:

```text
Create comment
Get comments
Update own comment
Delete own comment
```

Comments should include:

* Author
* Content
* Post
* Created timestamp
* Updated timestamp

Future extension:

```text
Nested comments
Comment likes
Comment replies
Comment mentions
```

For the first version, comments should remain **one level deep**.

---

# 3.5 Like System

Users can:

* Like a post.
* Unlike a post.
* Check whether they liked a post.

Important database rule:

A user must not be able to like the same post multiple times.

Therefore:

```text
UNIQUE(user_id, post_id)
```

should be enforced at the database level.

This prevents duplicate likes even when multiple requests arrive concurrently.

---

# 3.6 Follow System

Users can:

* Follow another user.
* Unfollow another user.
* View followers.
* View following.
* Check whether they follow another user.

Important rules:

```text
A user cannot follow themselves.
A user cannot follow the same user twice.
```

Database constraint:

```text
UNIQUE(follower_id, following_id)
```

---

# 3.7 Feed

Authenticated users should have a feed.

The initial feed can contain posts from:

* Users they follow.
* Optionally their own posts.

Example:

```text
GET /api/v1/feed
```

Posts should be ordered using:

```text
created_at DESC
```

The feed should support pagination.

---

# 3.8 Search

Basic search should support:

### Users

```text
GET /api/v1/users/search?q=showrav
```

Search by:

* Username
* Display name

### Posts

Optional future functionality:

```text
GET /api/v1/posts/search?q=javascript
```

---

# 3.9 Notifications

Basic notification support is recommended because it is a common social-media feature.

Examples:

```text
User A followed you.
User B liked your post.
User C commented on your post.
```

Notification types:

```text
FOLLOW
LIKE
COMMENT
```

Operations:

```text
Get notifications
Mark notification as read
Mark all notifications as read
```

---

# 3.10 Additional Recommended Features

These are not required for the initial implementation but should be considered in the architecture.

### User blocking

```text
Block user
Unblock user
```

### Post reporting

```text
Report post
```

### User reporting

```text
Report user
```

### Bookmarks

Users can save posts.

### Hashtags

Example:

```text
#javascript
#nodejs
#postgresql
```

### Mentions

Example:

```text
@showrav
```

### Admin functionality

Future administrative capabilities:

* Manage users
* Delete inappropriate posts
* Review reports
* Suspend accounts
* View platform statistics

---

# 4. Functional Requirements

## Authentication

* User registration
* User login
* User logout
* Current-user endpoint
* Password hashing
* Authentication middleware

## Users

* View profile
* Update profile
* Search users
* View followers
* View following

## Posts

* Create post
* Get post
* Get posts
* Update post
* Delete post

## Comments

* Create comment
* Get comments
* Update comment
* Delete comment

## Social graph

* Follow
* Unfollow
* Followers
* Following

## Engagement

* Like
* Unlike
* Like count
* Comment count

## Feed

* Personalized feed
* Pagination

---

# 5. Non-Functional Requirements

The application should prioritize:

### Security

* HTTP-only authentication cookies
* Password hashing
* Input validation
* SQL injection protection
* CORS configuration
* CSRF considerations
* Rate limiting
* Security headers
* Secure cookie configuration

### Performance

* Database indexes
* Connection pooling
* Pagination
* Efficient joins
* Avoid N+1 queries
* Appropriate query projections
* Cached counters where justified

### Maintainability

* Modular architecture
* Clear naming
* Small focused services
* Centralized errors
* Consistent API responses
* Automated testing
* Environment-based configuration

### Reliability

* Database transactions
* Foreign keys
* Unique constraints
* Graceful shutdown
* Database connection handling
* Request validation

---

# 6. Requirements

## Software

Recommended:

```text
Node.js >= 20
npm >= 10
PostgreSQL >= 16
Git
Modern browser
```

Optional:

```text
Docker
Docker Compose
Postman / Bruno / Insomnia
```

---

# 7. Technology Stack

## Frontend

```text
HTML5
CSS3
Vanilla JavaScript
Fetch API
```

The frontend intentionally uses vanilla technologies because the objective is to understand the underlying web architecture rather than hide complexity behind a frontend framework.

---

## Backend

```text
Node.js
Express.js
JavaScript
```

---

## Database

### PostgreSQL

PostgreSQL is the selected database.

### Why PostgreSQL?

The application's core data is highly relational:

```text
User
 ↓
Posts
 ↓
Comments
 ↓
Likes

User
 ↓
Followers / Following
```

The database needs strong guarantees for:

* Unique usernames
* Unique emails
* Unique likes
* Unique follows
* Foreign-key relationships
* Transactional operations
* Referential integrity
* Consistent counters

PostgreSQL provides these capabilities naturally.

MongoDB could work for this application, but PostgreSQL is preferred because the project's primary goal is also to practice **relational data modeling, transactions, indexing, joins, and consistency**.

---

## Database Driver / ORM

Recommended:

```text
pg
```

The first version should use PostgreSQL directly through the `pg` driver rather than hiding SQL completely behind an ORM.

This gives the developer practical experience with:

* SQL
* JOINs
* indexes
* transactions
* constraints
* query planning
* pagination
* PostgreSQL-specific behavior

If an ORM becomes necessary later, it can be introduced intentionally.

---

## Backend Dependencies

Recommended dependencies:

```text
express
pg
bcrypt
jsonwebtoken
cookie-parser
cors
helmet
express-rate-limit
zod
dotenv
pino
pino-http
```

Development/testing:

```text
nodemon
vitest
supertest
eslint
prettier
```

---

# 8. Authentication Architecture

Authentication should use a **cookie-based approach**.

The browser receives:

```text
Set-Cookie: access_token=...
```

The cookie should be configured approximately as:

```text
httpOnly: true
secure: true        # production
sameSite: strict/lax
```

The JavaScript application should never access the authentication token directly.

---

# 9. JWT Strategy

JWT can be used for authentication.

Recommended architecture:

```text
Access Token
+
Refresh Token
```

### Access token

Short-lived:

```text
15 minutes
```

### Refresh token

Longer-lived:

```text
7–30 days
```

Both should be handled through secure HTTP-only cookies.

For a small assignment, a single short-lived JWT cookie is acceptable, but the architecture should leave room for refresh-token authentication.

---

# 10. Authorization

Authentication answers:

> Who are you?

Authorization answers:

> Are you allowed to perform this operation?

Example:

```text
User A creates Post A.

User B:

GET Post A          → allowed
PUT Post A          → forbidden
DELETE Post A       → forbidden
```

The backend must never rely on frontend checks for authorization.

---

# 11. Architecture

The backend should use a **modular layered architecture**.

Recommended flow:

```text
Request
   ↓
Route
   ↓
Middleware
   ↓
Controller
   ↓
Service
   ↓
Repository
   ↓
PostgreSQL
```

### Responsibilities

#### Route

Defines API endpoints.

#### Middleware

Handles:

* Authentication
* Authorization
* Validation
* Rate limiting
* Request context

#### Controller

Handles HTTP concerns:

* Request
* Response
* Status code

Controllers should remain thin.

#### Service

Contains business logic.

Example:

```text
FollowUserService
CreatePostService
LikePostService
```

#### Repository

Responsible for database operations.

Example:

```text
UserRepository
PostRepository
CommentRepository
FollowRepository
```

This prevents SQL from spreading throughout controllers.

---

# 12. Recommended Folder Structure

```text
CodeAlpha_Social_Media_Platform/
│
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml
│
├── backend/
│   │
│   ├── package.json
│   ├── package-lock.json
│   │
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   │
│   │   ├── config/
│   │   │   ├── env.js
│   │   │   ├── database.js
│   │   │   └── logger.js
│   │   │
│   │   ├── routes/
│   │   │   └── index.js
│   │   │
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js
│   │   │   ├── error.middleware.js
│   │   │   ├── validation.middleware.js
│   │   │   └── rate-limit.middleware.js
│   │   │
│   │   ├── common/
│   │   │   ├── constants/
│   │   │   ├── utils/
│   │   │   ├── pagination/
│   │   │   └── response/
│   │   │
│   │   ├── errors/
│   │   │   ├── AppError.js
│   │   │   ├── AuthError.js
│   │   │   ├── ValidationError.js
│   │   │   └── NotFoundError.js
│   │   │
│   │   ├── modules/
│   │   │   │
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.js
│   │   │   │   ├── auth.service.js
│   │   │   │   ├── auth.repository.js
│   │   │   │   ├── auth.validation.js
│   │   │   │   ├── auth.routes.js
│   │   │   │   └── auth.test.js
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── user.controller.js
│   │   │   │   ├── user.service.js
│   │   │   │   ├── user.repository.js
│   │   │   │   ├── user.validation.js
│   │   │   │   ├── user.routes.js
│   │   │   │   └── user.test.js
│   │   │   │
│   │   │   ├── posts/
│   │   │   │   ├── post.controller.js
│   │   │   │   ├── post.service.js
│   │   │   │   ├── post.repository.js
│   │   │   │   ├── post.validation.js
│   │   │   │   ├── post.routes.js
│   │   │   │   └── post.test.js
│   │   │   │
│   │   │   ├── comments/
│   │   │   ├── likes/
│   │   │   ├── follows/
│   │   │   ├── feed/
│   │   │   └── notifications/
│   │   │
│   │   └── database/
│   │       ├── migrations/
│   │       ├── seeds/
│   │       └── queries/
│   │
│   └── tests/
│       ├── integration/
│       └── fixtures/
│
└── frontend/
    │
    ├── index.html
    ├── login.html
    ├── register.html
    ├── feed.html
    ├── profile.html
    ├── post.html
    │
    ├── assets/
    │   ├── images/
    │   └── icons/
    │
    ├── css/
    │   ├── reset.css
    │   ├── variables.css
    │   ├── global.css
    │   ├── components.css
    │   └── pages/
    │
    └── js/
        ├── api/
        │   ├── client.js
        │   ├── auth.api.js
        │   ├── users.api.js
        │   ├── posts.api.js
        │   ├── comments.api.js
        │   ├── likes.api.js
        │   └── follows.api.js
        │
        ├── components/
        │   ├── Navbar.js
        │   ├── PostCard.js
        │   ├── Comment.js
        │   ├── UserCard.js
        │   └── Modal.js
        │
        ├── pages/
        │   ├── login.js
        │   ├── register.js
        │   ├── feed.js
        │   └── profile.js
        │
        ├── state/
        │   └── auth.js
        │
        └── utils/
            ├── dom.js
            ├── format.js
            └── validation.js
```

---

# 13. Database Design

Core tables:

```text
users
profiles
posts
comments
post_likes
user_follows
notifications
```

---

## users

```text
id
email
username
password_hash
created_at
updated_at
```

Constraints:

```text
UNIQUE(email)
UNIQUE(username)
```

---

## profiles

```text
user_id
display_name
bio
avatar_url
cover_url
website
location
updated_at
```

Relationship:

```text
profiles.user_id → users.id
```

---

## posts

```text
id
user_id
content
image_url
created_at
updated_at
deleted_at
```

---

## comments

```text
id
post_id
user_id
content
created_at
updated_at
deleted_at
```

---

## post_likes

```text
user_id
post_id
created_at
```

Constraint:

```text
UNIQUE(user_id, post_id)
```

---

## user_follows

```text
follower_id
following_id
created_at
```

Constraint:

```text
UNIQUE(follower_id, following_id)
```

Application rule:

```text
follower_id != following_id
```

---

# 14. Database Indexing

Indexes should be designed according to actual query patterns.

Examples:

```sql
CREATE INDEX idx_posts_user_created
ON posts(user_id, created_at DESC);
```

```sql
CREATE INDEX idx_comments_post_created
ON comments(post_id, created_at DESC);
```

```sql
CREATE INDEX idx_follows_follower
ON user_follows(follower_id);
```

```sql
CREATE INDEX idx_follows_following
ON user_follows(following_id);
```

Unique indexes should be created automatically through:

```text
UNIQUE constraints
```

---

# 15. Transactions

Transactions are required when multiple database operations must remain consistent.

Example:

```text
Create post
    ↓
Create notification/event
```

If both operations belong to one atomic business operation:

```text
BEGIN

INSERT post

INSERT related record

COMMIT
```

If anything fails:

```text
ROLLBACK
```

---

## Example: Follow

Potential transaction:

```text
BEGIN

Check user exists

Create follow relationship

Create notification

COMMIT
```

Failure:

```text
ROLLBACK
```

---

## Example: Like

```text
BEGIN

Insert like

Update cached like count

Create notification

COMMIT
```

The exact implementation may evolve depending on whether counters are calculated dynamically or denormalized.

---

# 16. Connection Pooling

The backend should use PostgreSQL connection pooling.

Example concept:

```text
Application
     │
     ├── Request 1 ──┐
     ├── Request 2 ──┤
     ├── Request 3 ──┤
     └── Request 4 ──┘
                    ↓
             PostgreSQL Pool
                    ↓
              PostgreSQL
```

Do not create a new database connection for every request.

Use a shared pool:

```text
pg.Pool
```

Transactions must acquire and release a dedicated client correctly.

---

# 17. Configuration

Environment variables should be used for configuration.

Example:

```env
NODE_ENV=development

PORT=5000

DATABASE_URL=postgresql://user:password@localhost:5432/social_media

JWT_ACCESS_SECRET=change-me
JWT_ACCESS_EXPIRES_IN=15m

COOKIE_NAME=access_token

CORS_ORIGIN=http://localhost:5500
```

Never commit:

```text
.env
```

Commit:

```text
.env.example
```

---

# 18. Database Migrations

Database schema changes must be tracked through migrations.

Example:

```text
001_create_users.sql
002_create_profiles.sql
003_create_posts.sql
004_create_comments.sql
005_create_post_likes.sql
006_create_user_follows.sql
007_create_notifications.sql
```

Never rely on manually modifying a production database.

Migration history should be reproducible.

---

# 19. Seed Data

A seed system should create realistic development data.

Example:

```text
10 users
30 posts
80 comments
100 likes
20 follow relationships
```

Seed users can include:

```text
admin@example.com
alice@example.com
bob@example.com
```

Seed scripts should be:

```text
idempotent where practical
```

Meaning running them repeatedly should not unnecessarily create duplicate records.

---

# 20. API Design

Base URL:

```text
/api/v1
```

Example:

```text
GET /api/v1/users/:id
```

The API should use standard HTTP semantics.

### Status codes

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests
500 Internal Server Error
```

---

# 21. Standard API Response

Success:

```json
{
  "success": true,
  "data": {},
  "message": "Request successful"
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "Post not found"
  }
}
```

Paginated response:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

---

# 22. API Endpoints

## Authentication

| Method | Endpoint                | Description            | Auth        |
| ------ | ----------------------- | ---------------------- | ----------- |
| POST   | `/api/v1/auth/register` | Register user          | No          |
| POST   | `/api/v1/auth/login`    | Login                  | No          |
| POST   | `/api/v1/auth/logout`   | Logout                 | Yes         |
| GET    | `/api/v1/auth/me`       | Current user           | Yes         |
| POST   | `/api/v1/auth/refresh`  | Refresh authentication | Yes/Refresh |

---

## Users

| Method | Endpoint                      | Description     | Auth     |
| ------ | ----------------------------- | --------------- | -------- |
| GET    | `/api/v1/users/:id`           | Get profile     | Optional |
| PATCH  | `/api/v1/users/me`            | Update profile  | Yes      |
| PATCH  | `/api/v1/users/me/password`   | Change password | Yes      |
| GET    | `/api/v1/users/search?q=`     | Search users    | Optional |
| GET    | `/api/v1/users/:id/posts`     | User posts      | Optional |
| GET    | `/api/v1/users/:id/followers` | Followers       | Optional |
| GET    | `/api/v1/users/:id/following` | Following       | Optional |

---

## Posts

| Method | Endpoint                     | Description     | Auth     |
| ------ | ---------------------------- | --------------- | -------- |
| POST   | `/api/v1/posts`              | Create post     | Yes      |
| GET    | `/api/v1/posts`              | List posts      | Optional |
| GET    | `/api/v1/posts/:id`          | Get post        | Optional |
| PATCH  | `/api/v1/posts/:id`          | Update own post | Yes      |
| DELETE | `/api/v1/posts/:id`          | Delete own post | Yes      |
| GET    | `/api/v1/posts/:id/comments` | Get comments    | Optional |

---

## Comments

| Method | Endpoint                     | Description        | Auth |
| ------ | ---------------------------- | ------------------ | ---- |
| POST   | `/api/v1/posts/:id/comments` | Create comment     | Yes  |
| PATCH  | `/api/v1/comments/:id`       | Update own comment | Yes  |
| DELETE | `/api/v1/comments/:id`       | Delete own comment | Yes  |

---

## Likes

| Method | Endpoint                  | Description    | Auth     |
| ------ | ------------------------- | -------------- | -------- |
| POST   | `/api/v1/posts/:id/like`  | Like post      | Yes      |
| DELETE | `/api/v1/posts/:id/like`  | Unlike post    | Yes      |
| GET    | `/api/v1/posts/:id/likes` | Get post likes | Optional |

---

## Follows

| Method | Endpoint                      | Description   | Auth     |
| ------ | ----------------------------- | ------------- | -------- |
| POST   | `/api/v1/users/:id/follow`    | Follow user   | Yes      |
| DELETE | `/api/v1/users/:id/follow`    | Unfollow user | Yes      |
| GET    | `/api/v1/users/:id/followers` | Get followers | Optional |
| GET    | `/api/v1/users/:id/following` | Get following | Optional |

---

## Feed

| Method | Endpoint       | Description       | Auth |
| ------ | -------------- | ----------------- | ---- |
| GET    | `/api/v1/feed` | Personalized feed | Yes  |

---

## Notifications

| Method | Endpoint                         | Description       | Auth |
| ------ | -------------------------------- | ----------------- | ---- |
| GET    | `/api/v1/notifications`          | Get notifications | Yes  |
| PATCH  | `/api/v1/notifications/:id/read` | Mark as read      | Yes  |
| PATCH  | `/api/v1/notifications/read-all` | Mark all as read  | Yes  |

---

# 23. Pagination

List endpoints must not return unlimited records.

Bad:

```text
GET /posts
```

returning every post.

Instead:

```text
GET /api/v1/posts?page=1&limit=20
```

For more scalable feeds, cursor-based pagination can eventually be introduced:

```text
GET /api/v1/feed?limit=20&cursor=abc123
```

Cursor pagination is preferable for large, frequently changing feeds.

---

# 24. Validation

All external input must be validated on the backend.

Example registration:

```text
email
username
password
displayName
```

Validation library:

```text
Zod
```

Validation should happen before business logic.

Example:

```text
Request
 ↓
Schema Validation
 ↓
Controller
 ↓
Service
```

Never trust frontend validation alone.

---

# 25. Error Handling

All errors should eventually reach one centralized error middleware.

Example:

```text
throw new NotFoundError("Post not found");
```

Central middleware converts it into:

```json
{
  "success": false,
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "Post not found"
  }
}
```

Do not expose:

```text
database stack traces
SQL queries
internal secrets
```

in production responses.

---

# 26. Security

The backend should include:

### Helmet

Security-related HTTP headers.

### CORS

Only allow configured frontend origins.

### Rate limiting

Especially:

```text
/login
/register
/password
```

### Password hashing

Use:

```text
bcrypt
```

### Cookie security

Use:

```text
httpOnly
secure
sameSite
```

### SQL injection protection

Use parameterized queries:

```sql
WHERE id = $1
```

Never construct SQL using string concatenation.

---

# 27. Soft Delete

Posts and comments can use:

```text
deleted_at
```

instead of immediately removing the database record.

Example:

```text
deleted_at = NULL
```

means active.

```text
deleted_at != NULL
```

means deleted.

This makes future moderation, auditing, and recovery easier.

---

# 28. API Versioning

The API starts with:

```text
/api/v1
```

Future breaking changes can use:

```text
/api/v2
```

Example:

```text
/api/v1/users
/api/v2/users
```

This prevents breaking existing clients immediately when API contracts change.

---

# 29. Testing Strategy

Testing should exist at multiple levels.

## Unit tests

Test:

```text
Services
Utilities
Validation
Business rules
```

Example:

```text
should reject following yourself
should prevent duplicate likes
should reject duplicate username
```

## Integration tests

Test:

```text
Service + PostgreSQL
Repository + PostgreSQL
Transactions
```

## API tests

Use:

```text
Supertest
```

Test:

```text
POST /auth/register
POST /auth/login
POST /posts
POST /posts/:id/like
POST /users/:id/follow
```

---

# 30. Logging

Use structured logging.

Recommended:

```text
Pino
```

Development:

```text
Readable logs
```

Production:

```text
JSON structured logs
```

Useful information:

```text
request ID
method
path
status
duration
user ID
error code
```

Never log:

```text
password
JWT secrets
authentication tokens
```

---

# 31. Request ID / Correlation ID

Each request should have a unique ID.

Example:

```text
X-Request-ID: 4b7f...
```

This becomes useful when debugging:

```text
Frontend request
      ↓
Backend log
      ↓
Database error
```

The same request ID helps connect these events.

---

# 32. Graceful Shutdown

The server should handle:

```text
SIGTERM
SIGINT
```

Shutdown sequence:

```text
Stop accepting new requests
        ↓
Finish active requests
        ↓
Close PostgreSQL pool
        ↓
Close server
        ↓
Exit
```

This becomes important when deploying with Docker, containers, or orchestration platforms.

---

# 33. Frontend Architecture

Although the frontend uses vanilla JavaScript, it should still have structure.

Recommended separation:

```text
API layer
   ↓
State
   ↓
Page logic
   ↓
Components
   ↓
DOM
```

Example:

```text
posts.api.js
     ↓
feed.js
     ↓
PostCard.js
     ↓
DOM
```

Avoid putting:

```text
fetch()
DOM manipulation
business logic
authentication logic
```

all inside one huge JavaScript file.

---

# 34. Frontend API Client

Instead of repeatedly writing:

```javascript
fetch(...)
```

create a centralized API client.

Example responsibilities:

```text
base URL
credentials
headers
JSON parsing
error handling
```

Authentication cookies are automatically included using:

```javascript
credentials: "include"
```

---

# 35. API Security Boundary

The frontend is considered **untrusted**.

Never assume:

```text
button hidden = authorization
```

For example, hiding a delete button does not prevent:

```text
DELETE /api/v1/posts/123
```

The backend must independently verify ownership.

---

# 36. Scalability Strategy

The first implementation is a **modular monolith**.

Do not start with microservices.

Architecture:

```text
                 ┌───────────────┐
                 │   Frontend    │
                 └───────┬───────┘
                         │
                         ▼
                 ┌───────────────┐
                 │ Express API   │
                 └───────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
     Auth            Social            Content
     Module          Modules           Modules
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                   PostgreSQL
```

This provides modularity without introducing unnecessary distributed-system complexity.

---

# 37. Future Scaling Path

If the platform grows significantly, components could eventually be separated:

```text
API Gateway
    │
    ├── Auth Service
    ├── User Service
    ├── Post Service
    ├── Social Graph Service
    ├── Notification Service
    └── Feed Service
```

Additional infrastructure could eventually include:

```text
Redis
Message Queue
Object Storage
CDN
Search Engine
Read Replicas
Background Workers
```

But these should only be introduced when justified by actual requirements.

---

# 38. Caching

Redis is not required for the initial version.

Potential future cache targets:

```text
User profiles
Popular posts
Feed results
Session/token data
Rate-limit counters
```

Avoid caching everything prematurely.

---

# 39. Media Storage

Images should not be stored directly in PostgreSQL.

Future architecture:

```text
Frontend
   ↓
Backend
   ↓
Object Storage
   ↓
Image URL
   ↓
PostgreSQL
```

Potential providers:

```text
Cloudinary
AWS S3
Cloudflare R2
```

The initial version can simply use image URLs.

---

# 40. Feed Architecture

Initial implementation:

```text
SELECT posts
FROM posts
JOIN user_follows
...
ORDER BY created_at DESC
LIMIT 20;
```

This is a straightforward **fan-out-on-read** approach.

For very large systems, alternative approaches include:

```text
Fan-out-on-write
Fan-out-on-read
Hybrid feed generation
```

The project should start with fan-out-on-read because it is simpler and appropriate for a mini social platform.

---

# 41. Data Consistency

Important invariants:

```text
Email must be unique.
Username must be unique.
A user cannot follow themselves.
A user cannot follow another user twice.
A user cannot like a post twice.
A comment must belong to an existing post.
A comment must belong to an existing user.
A post must belong to an existing user.
```

These rules should be enforced at multiple levels where appropriate:

```text
Frontend
Backend validation
Business logic
Database constraints
```

The database remains the final integrity boundary.

---

# 42. API Idempotency

Operations such as:

```text
DELETE /posts/:id/like
DELETE /users/:id/follow
```

should be designed so repeated requests do not produce invalid state.

For example:

```text
Unlike already-unliked post
```

should not corrupt data.

Database constraints and appropriate service logic should protect against duplicate state.

---

# 43. Repository Pattern

Repositories should encapsulate database access.

Example:

```text
PostRepository
├── create()
├── findById()
├── findMany()
├── update()
├── delete()
└── exists()
```

The service should not need to know SQL implementation details.

Example:

```text
PostController
      ↓
PostService
      ↓
PostRepository
      ↓
PostgreSQL
```

---

# 44. Service Layer

Services contain business rules.

Example:

```text
LikePostService
```

Responsibilities:

```text
Validate post exists
Check whether user already liked it
Create like
Create notification
Return result
```

Controllers should not contain these rules.

---

# 45. Repository Transactions

Transactions should be owned by the business operation.

For example:

```text
FollowService
```

may execute:

```text
BEGIN
    createFollow()
    createNotification()
COMMIT
```

The repository provides the database operations while the service determines the transactional boundary.

---

# 46. Documentation

The project should document:

```text
README.md
API documentation
Database schema
Architecture
Environment variables
Setup instructions
Testing instructions
Deployment instructions
```

Optional:

```text
OpenAPI specification
```

Recommended endpoint documentation:

```text
/api/v1/...
```

with:

```text
request
response
authentication
status codes
errors
```

---

# 47. Development Workflow

Recommended workflow:

```text
1. Create issue
2. Define requirement
3. Design database/API
4. Implement backend
5. Write tests
6. Implement frontend
7. Test integration
8. Review
9. Commit
```

Example commit style:

```text
feat(auth): add cookie-based authentication
feat(posts): add post creation API
feat(likes): implement post like system
fix(auth): handle expired access token
test(posts): add post service tests
docs(api): document post endpoints
```

---

# 48. Suggested Development Phases

## Phase 1 — Project Foundation

```text
Repository
Backend setup
Frontend setup
Environment configuration
Express application
PostgreSQL connection
Error handling
Logging
```

## Phase 2 — Database

```text
Schema
Migrations
Indexes
Foreign keys
Seed data
```

## Phase 3 — Authentication

```text
Registration
Login
Logout
Cookie authentication
Password hashing
Auth middleware
```

## Phase 4 — Users

```text
Profiles
Profile editing
User search
Followers
Following
```

## Phase 5 — Posts

```text
Create
Read
Update
Delete
Pagination
Ownership
```

## Phase 6 — Comments

```text
Create
Read
Update
Delete
Pagination
```

## Phase 7 — Social Engagement

```text
Likes
Unlike
Follow
Unfollow
Counters
```

## Phase 8 — Feed

```text
Following feed
Pagination
Feed queries
Performance optimization
```

## Phase 9 — Notifications

```text
Follow notifications
Like notifications
Comment notifications
Read/unread state
```

## Phase 10 — Frontend

```text
Authentication UI
Feed
Profile
Post creation
Comments
Likes
Follow
Notifications
```

## Phase 11 — Testing

```text
Unit tests
Integration tests
API tests
Security tests
Edge cases
```

## Phase 12 — Hardening

```text
Rate limiting
Helmet
CORS
Input validation
Indexes
Query optimization
Graceful shutdown
Production configuration
```

---

# 49. Important Edge Cases

The implementation must explicitly consider:

### Authentication

```text
Duplicate email
Duplicate username
Wrong password
Expired token
Missing token
Invalid token
Logout without active session
```

### Posts

```text
Empty post
Very long post
Non-existent post
Editing another user's post
Deleting another user's post
```

### Comments

```text
Comment on deleted post
Empty comment
Editing another user's comment
Deleting another user's comment
```

### Likes

```text
Duplicate like
Unlike without like
Like deleted post
Concurrent like requests
```

### Follows

```text
Follow yourself
Duplicate follow
Unfollow without following
Follow deleted user
```

---

# 50. Definition of Done

A feature is not considered complete simply because the endpoint works.

For each feature:

```text
Database
    ↓
Migration
    ↓
Repository
    ↓
Service
    ↓
Validation
    ↓
Controller
    ↓
Route
    ↓
Authentication/Authorization
    ↓
Error handling
    ↓
Tests
    ↓
Frontend integration
    ↓
Documentation
```

---

# 51. Project Principles

The project follows these principles:

### 1. Keep the backend authoritative

Never trust frontend authorization.

### 2. Keep controllers thin

Business logic belongs in services.

### 3. Keep database access isolated

SQL belongs in repositories.

### 4. Prefer database constraints

Do not rely exclusively on application-level checks.

### 5. Use transactions intentionally

Transactions are for maintaining business invariants, not for wrapping every query unnecessarily.

### 6. Index based on access patterns

Do not blindly index every column.

### 7. Paginate every potentially large collection

Never return unlimited data.

### 8. Start simple, design for evolution

Do not introduce microservices, Redis, queues, or distributed systems before they are necessary.

### 9. Security is a backend responsibility

Frontend validation is only a user-experience feature.

### 10. Optimize based on evidence

Measure first, then optimize.

---

# 52. Final Architecture

The resulting application should follow this conceptual architecture:

```text
┌───────────────────────────────────────────────┐
│                   FRONTEND                    │
│                                               │
│ HTML + CSS + JavaScript                       │
│ Components + Pages + API Client               │
└───────────────────────┬───────────────────────┘
                        │
                     REST API
                        │
                        ▼
┌───────────────────────────────────────────────┐
│                 EXPRESS API                   │
│                                               │
│ Routes                                        │
│   ↓                                           │
│ Middleware                                    │
│   ↓                                           │
│ Controllers                                   │
│   ↓                                           │
│ Services                                      │
│   ↓                                           │
│ Repositories                                  │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│                  POSTGRESQL                   │
│                                               │
│ Users                                         │
│ Profiles                                      │
│ Posts                                         │
│ Comments                                      │
│ Likes                                         │
│ Follows                                       │
│ Notifications                                 │
│                                               │
│ Constraints + Indexes + Transactions          │
└───────────────────────────────────────────────┘
```

---

# 53. Project Goal

This project should not merely demonstrate:

> "I can build CRUD APIs."

It should demonstrate:

> **"I understand how to design a maintainable backend and full-stack application with clear boundaries, data integrity, security, and a path toward future scale."**

The first version remains intentionally small enough to complete, while the architecture provides room for future capabilities such as Redis caching, background workers, object storage, real-time notifications, search, moderation, and eventually distributed services.

---

## License

This project is developed for educational and portfolio purposes.
