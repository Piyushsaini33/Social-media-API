# Social Media API Project Guide

## Overview

This project is a REST API for a social media application. It uses Express 5 for HTTP routing, MongoDB with Mongoose for persistence, JWT for authentication, Multer for local multipart uploads, and Cloudinary for storing uploaded media.

## Project Structure

```text
Social media API/
├── package.json                 # Dependencies and npm scripts
├── package-lock.json            # Locked dependency versions
├── PROJECT_GUIDE.md             # This guide
├── public/
│   └── temp/                    # Temporary files saved by Multer
├── test/
│   └── user.routes.test.js      # HTTP route tests using Node's test runner
└── src/
    ├── index.js                 # Loads environment and starts DB/API
    ├── app.js                   # Express middleware, docs, routes, errors
    ├── docs/
    │   └── openapi.js           # OpenAPI definition used by Swagger UI
    ├── db/
    │   └── dbConnect.js         # Mongoose connection to local MongoDB
    ├── controllers/
    │   ├── user.controller.js   # Registration, login, profiles, follows, search
    │   └── post.controller.js   # Posts, feed, likes, comments
    ├── middlewares/
    │   ├── auth.middleware.js   # JWT verification and req.user assignment
    │   └── multer.middleware.js # Image type/size checks and temporary storage
    ├── models/
    │   ├── user.model.js        # User schema, password hashing, JWT methods
    │   ├── posts.model.js       # Post schema and counters
    │   ├── follows.model.js     # Follow relationship schema
    │   ├── likes.model.js       # Like relationship schema
    │   └── comments.model.js    # Comment schema
    ├── routes/
    │   ├── user.routes.js       # User API endpoint wiring
    │   └── post.routes.js       # Post API endpoint wiring
    └── utils/
        ├── apiError.util.js     # HTTP error representation
        ├── apiResponse.util.js  # Standard success response representation
        ├── asyncHandler.util.js # Forwards async route errors to Express
        └── cloudinary.util.js   # Upload/delete media in Cloudinary
```

## Requirements and Configuration

- Node.js (Node 22 was used for the built-in test runner).
- MongoDB running locally at `mongodb://127.0.0.1:27017/socialMediaAPI`, as configured in `src/db/dbConnect.js`.
- A Cloudinary account for registration avatars and post/avatar uploads.
- Environment variables loaded by `dotenv/config` in `src/index.js`. Put the `.env` file in the project root, beside `package.json`.

Expected environment variable names:

```dotenv
PORT=3000
CORS_ORIGIN=http://localhost:5173
ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=replace-with-another-long-random-secret
REFRESH_TOKEN_EXPIRY=7d
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

Use your actual local values. Do not commit `.env` or share its secret values. The database URL is currently hardcoded in `src/db/dbConnect.js`; changing MongoDB environments requires updating that file or externalizing the URL.

## Install and Run

```bash
npm install
npm run dev
```

The server waits for MongoDB to connect before it listens. The port comes from `PORT`, or defaults to `8000` when it is not set. With `PORT=3000`, the useful local URLs are:

- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI JSON: `http://localhost:3000/api-docs.json`
- Health check: `http://localhost:3000/healthCheck`

For a non-watch production-style run:

```bash
npm start
```

Run the automated tests with:

```bash
npm test
```

The current tests use Node's built-in test runner, stub database and Cloudinary behavior, and make HTTP requests against an ephemeral local Express server. They do not require a live MongoDB or Cloudinary account.

## Application Request Flow

Most requests follow this sequence:

1. `src/index.js` loads environment variables.
2. `src/index.js` connects to MongoDB.
3. `src/app.js` configures JSON parsing, CORS, cookies, Swagger, and route mounts.
4. An Express router in `src/routes/` matches the URL and HTTP method.
5. Protected route groups run `verifyJWT`, which checks a bearer token or access-token cookie and sets `req.user`.
6. Upload routes run Multer before the controller. Multer stores the file in `public/temp` and exposes it as `req.file` for `.single(...)` routes.
7. The controller validates input and calls Mongoose models and/or the Cloudinary utility.
8. A success response uses `apiResponse`; errors are forwarded by `asyncHandler` to the error middleware in `app.js`.

## Main Workflows

### Registration

`POST /api/v1/users/register` accepts `multipart/form-data` with `username`, `email`, `password`, and `avatar`. The user router runs `upload.single("avatar")`, which makes the upload available at `req.file`. Multer currently accepts `image/jpeg`, `image/png`, and `image/jpg`, with a 5 MB size limit. The controller uploads the local file to Cloudinary, checks whether the username or email already exists, creates a user, and returns the created user without password or refresh-token fields.

### Login and authentication

`POST /api/v1/users/login` accepts JSON with `username` or `email`, plus `password`. The model compares the submitted password with the bcrypt hash. On success, the controller generates access and refresh JWTs, stores the refresh token, returns token data, and sets HTTP-only cookies.

Protected routes accept the access token from the `accessToken` cookie or an `Authorization: Bearer <token>` header. `verifyJWT` verifies the token, loads the user, and assigns it to `req.user`.

`POST /api/v1/users/refresh-token` accepts a refresh token in JSON or a refresh-token cookie. `POST /api/v1/users/logout` removes the stored refresh token and clears the cookies.

### User profile and follow

`GET /api/v1/users/c/:username` returns a profile and its follower/following counts. `POST /api/v1/users/follow/:targetUserId` toggles the signed-in user's follow relationship. The follow collection references both users and has a unique compound index on `{ follower, following }`.

`GET /api/v1/users/search?query=...` searches usernames and supports `page` and `limit` pagination. `PATCH /api/v1/users/avatar` accepts a multipart `avatar` file and uploads it to Cloudinary.

### Posts, feed, likes, and comments

All post routes require authentication.

- `POST /api/v1/posts` accepts a caption, an optional `image` file, or both. The image is uploaded to Cloudinary and the post is stored with the authenticated user as its owner.
- `GET /api/v1/posts` returns a paginated feed containing the signed-in user's posts and posts by followed users.
- `POST /api/v1/posts/:postId/like` toggles the user's like on a post and updates `likesCount`.
- `POST /api/v1/posts/:postId/comment` creates a comment and increments `commentsCount`.

The Like collection has a unique compound index on `{ post, user }` to prevent duplicate like records.

## API Endpoint Summary

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/healthCheck` | Public | Check that the API responds |
| `POST` | `/api/v1/users/register` | Public | Register with an avatar upload |
| `POST` | `/api/v1/users/login` | Public | Log in and receive tokens |
| `POST` | `/api/v1/users/refresh-token` | Refresh token | Rotate access/refresh tokens |
| `POST` | `/api/v1/users/logout` | JWT | Log out |
| `GET` | `/api/v1/users/search` | JWT | Search users by username |
| `GET` | `/api/v1/users/c/:username` | JWT | Get a profile and follow counts |
| `POST` | `/api/v1/users/follow/:targetUserId` | JWT | Toggle follow status |
| `PATCH` | `/api/v1/users/avatar` | JWT | Update the avatar |
| `GET` | `/api/v1/posts` | JWT | Get the feed |
| `POST` | `/api/v1/posts` | JWT | Create a post |
| `POST` | `/api/v1/posts/:postId/like` | JWT | Toggle post like |
| `POST` | `/api/v1/posts/:postId/comment` | JWT | Add a comment |

Swagger UI provides an interactive view of these operations at `/api-docs`.

## Build Sequence: Step by Step

This is a practical sequence for constructing the project from a new folder. It describes the architecture reflected by the current code, rather than claiming every historical edit was made in this exact order.

1. **Initialize the Node project.** Create `package.json`, set ES modules with `"type": "module"`, and add scripts for development, start, and tests.
2. **Install the runtime dependencies.** Add Express, Mongoose, dotenv, cookie-parser, CORS, bcrypt, jsonwebtoken, Multer, Cloudinary, nodemon, and swagger-ui-express.
3. **Lay out the source folders.** Create `db`, `models`, `controllers`, `middlewares`, `routes`, `utils`, and `docs` under `src`; create `public/temp` for uploads and `test` for tests.
4. **Configure environment loading and the database.** Load dotenv before importing application modules that read environment variables, then connect to MongoDB before starting the HTTP listener.
5. **Define the data models.** Create the user schema with unique username/email fields, password hashing and comparison, and token-generation methods. Add schemas for posts, comments, likes, and follows, using ObjectId references for relationships. Add uniqueness constraints where duplicate relationships must not exist.
6. **Create shared utilities.** Add standard success/error objects, an async route wrapper, and a Cloudinary helper that uploads temporary files and cleans them up.
7. **Implement middleware.** Configure JWT verification to attach the authenticated user to the request. Configure Multer storage, image MIME-type validation, and file-size limits.
8. **Implement user controllers.** Add registration, login, refresh/logout, profile retrieval, follow toggling, user search, and avatar update operations. Keep credentials and refresh tokens out of public user responses.
9. **Implement post controllers.** Add post creation, feed pagination, like toggling, and comments; associate new records with `req.user` and update post counters.
10. **Wire routes.** Define public user endpoints first, then apply JWT middleware to protected user endpoints. Require JWT for all post routes. Attach Multer only to endpoints that accept files.
11. **Assemble the Express app.** Configure JSON, CORS, cookie parsing, Swagger routes, API routers, health check, and centralized error handling.
12. **Document the API.** Define the OpenAPI paths, authentication scheme, JSON bodies, multipart fields, and response codes; serve the UI at `/api-docs`.
13. **Add and run tests.** Use Node's built-in test runner to exercise success and invalid-input HTTP behavior. Stub integrations for unit/in-process tests; add separate integration tests when a live test database or Cloudinary test setup is available.
14. **Run and manually verify.** Start MongoDB, set local environment values, run `npm run dev`, open Swagger UI, and test registration/login and protected calls. Confirm uploads use the expected multipart field names and accepted image MIME types.

## Testing With Swagger

1. Start the API with `npm run dev` and open `/api-docs` on the port printed in the terminal.
2. Try public routes first, such as registration or login.
3. For registration, choose `multipart/form-data`, provide all text fields, and select an image file for `avatar`.
4. After login, copy the returned access token. Click Swagger's **Authorize** button and enter the token as a bearer credential.
5. Try a protected profile, feed, or post operation.
6. For post creation, send `caption` and/or a supported image under the field name `image`.

If an upload fails, check the HTTP response body and server terminal output. Common prerequisites include the correct multipart field name, JPEG/PNG MIME type under the current Multer filter, an existing `public/temp` directory, and valid Cloudinary settings loaded from the project-root `.env`.
