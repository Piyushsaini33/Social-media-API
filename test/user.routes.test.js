import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { once } from "node:events";
import { resolve } from "node:path";
import { after, before, test } from "node:test";
import { v2 as cloudinary } from "cloudinary";
import { User } from "../src/models/user.model.js";
import app from "../src/app.js";

let server;
let baseUrl;

const safeUser = {
  _id: "test-user-id",
  username: "test-user",
  email: "test@example.com",
  avatar: "https://example.com/avatar.png",
};

const userDocument = {
  ...safeUser,
  refreshToken: null,
  save: async () => {},
  select: async () => safeUser,
  isPasswordCorrect: async (password) => password === "correct-password",
  generateAccessToken: async () => "test-access-token",
  generateRefreshToken: async () => "test-refresh-token",
};

before(async () => {
  process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
  process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";
  process.env.ACCESS_TOKEN_EXPIRY = "15m";
  process.env.REFRESH_TOKEN_EXPIRY = "7d";

  await mkdir(resolve("public/temp"), { recursive: true });
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (!server) return;

  server.closeAllConnections();
  await new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
});

test("registers a user with an uploaded avatar", async (t) => {
  t.mock.method(cloudinary.uploader, "upload", async () => ({
    url: "https://example.com/avatar.png",
    secure_url: "https://example.com/avatar.png",
  }));
  t.mock.method(User, "findOne", async () => null);
  t.mock.method(User, "create", async (user) => ({ ...user, _id: safeUser._id }));
  t.mock.method(User, "findById", () => userDocument);

  const form = new FormData();
  form.set("username", safeUser.username);
  form.set("email", safeUser.email);
  form.set("password", "correct-password");
  form.set("avatar", new Blob(["image data"], { type: "image/png" }), "avatar.png");

  const response = await fetch(`${baseUrl}/api/v1/users/register`, {
    method: "POST",
    body: form,
  });
  const body = await response.json();

  assert.equal(response.status, 201);
  assert.equal(body.data.username, safeUser.username);
  assert.equal(body.data.avatar, safeUser.avatar);
});

test("serves Swagger UI and documents avatar uploads", async () => {
  const [uiResponse, specResponse] = await Promise.all([
    fetch(`${baseUrl}/api-docs/`),
    fetch(`${baseUrl}/api-docs.json`),
  ]);
  const ui = await uiResponse.text();
  const spec = await specResponse.json();
  const avatarSchema =
    spec.paths["/api/v1/users/register"].post.requestBody.content[
      "multipart/form-data"
    ].schema.properties.avatar;

  assert.equal(uiResponse.status, 200);
  assert.match(ui, /swagger-ui/);
  assert.equal(specResponse.status, 200);
  assert.equal(avatarSchema.format, "binary");
});

test("logs in with valid credentials", async (t) => {
  t.mock.method(User, "findOne", async () => userDocument);
  t.mock.method(User, "findById", () => userDocument);

  const response = await fetch(`${baseUrl}/api/v1/users/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: safeUser.email,
      password: "correct-password",
    }),
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.accessToken, "test-access-token");
  assert.equal(body.data.refreshToken, "test-refresh-token");
});

test("rejects registration and login requests with missing required input", async () => {
  const registrationResponse = await fetch(`${baseUrl}/api/v1/users/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "", email: "test@example.com" }),
  });
  const registrationBody = await registrationResponse.json();

  assert.equal(registrationResponse.status, 400);
  assert.equal(registrationBody.message, "All fields are required");

  const loginResponse = await fetch(`${baseUrl}/api/v1/users/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "correct-password" }),
  });
  const loginBody = await loginResponse.json();

  assert.equal(loginResponse.status, 400);
  assert.equal(loginBody.message, "username or email is required");
});