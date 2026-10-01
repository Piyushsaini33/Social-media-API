const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Social Media API",
    version: "1.0.0",
    description: "Interactive documentation for the social media API.",
  },
  servers: [{ url: "/", description: "Current server" }],
  tags: [
    { name: "Users" },
    { name: "Posts" },
    { name: "System" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ApiResponse: {
        type: "object",
        properties: {
          statusCode: { type: "integer", example: 200 },
          data: {},
          message: { type: "string", example: "Request completed successfully" },
          success: { type: "boolean", example: true },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          statusCode: { type: "integer", example: 400 },
          message: { type: "string", example: "Invalid request" },
          errors: { type: "array", items: {} },
        },
      },
    },
  },
  paths: {
    "/healthCheck": {
      get: {
        tags: ["System"],
        summary: "Check API health",
        responses: {
          200: {
            description: "API is running",
            content: { "application/json": { schema: { type: "string", example: "API is working fine" } } },
          },
        },
      },
    },
    "/api/v1/users/register": {
      post: {
        tags: ["Users"],
        summary: "Register a user",
        description: "Submit the avatar as a JPG or PNG image in multipart form data.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["username", "email", "password", "avatar"],
                properties: {
                  username: { type: "string", example: "piyush4141" },
                  email: { type: "string", format: "email", example: "user@example.com" },
                  password: { type: "string", format: "password", example: "your-password" },
                  avatar: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "User registered", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } } },
          400: { description: "Missing fields or unsupported avatar type", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          409: { description: "Username or email already exists" },
        },
      },
    },
    "/api/v1/users/login": {
      post: {
        tags: ["Users"],
        summary: "Log in",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["password"],
                properties: {
                  email: { type: "string", format: "email" },
                  username: { type: "string" },
                  password: { type: "string", format: "password" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Logged in; returns access and refresh tokens" },
          400: { description: "Username or email is required" },
          401: { description: "Invalid credentials" },
          404: { description: "User not found" },
        },
      },
    },
    "/api/v1/users/refresh-token": {
      post: {
        tags: ["Users"],
        summary: "Refresh authentication tokens",
        description: "Provide refreshToken in the request body, or send the refreshToken cookie.",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: { description: "Tokens refreshed" },
          401: { description: "Missing or invalid refresh token" },
        },
      },
    },
    "/api/v1/users/logout": {
      post: {
        tags: ["Users"],
        summary: "Log out",
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: "Logged out" }, 401: { description: "Unauthorized" } },
      },
    },
    "/api/v1/users/search": {
      get: {
        tags: ["Users"],
        summary: "Search users by username",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "query", in: "query", required: true, schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, default: 10 } },
        ],
        responses: { 200: { description: "Matching users and pagination" }, 400: { description: "Search query is required" } },
      },
    },
    "/api/v1/users/c/{username}": {
      get: {
        tags: ["Users"],
        summary: "Get a user profile",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "User profile and follow counts" }, 404: { description: "User not found" } },
      },
    },
    "/api/v1/users/follow/{targetUserId}": {
      post: {
        tags: ["Users"],
        summary: "Toggle follow status for a user",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "targetUserId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Follow status updated" }, 400: { description: "Invalid ID or self-follow attempt" }, 404: { description: "Target user not found" } },
      },
    },
    "/api/v1/users/avatar": {
      patch: {
        tags: ["Users"],
        summary: "Update the current user's avatar",
        description: "Upload a JPG or PNG image using the avatar form field.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["avatar"],
                properties: { avatar: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: { 200: { description: "Avatar updated" }, 400: { description: "Missing file or unsupported image type" } },
      },
    },
    "/api/v1/posts": {
      get: {
        tags: ["Posts"],
        summary: "Get the authenticated user's feed",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, default: 10 } },
        ],
        responses: { 200: { description: "Feed posts and pagination" }, 401: { description: "Unauthorized" } },
      },
      post: {
        tags: ["Posts"],
        summary: "Create a post",
        description: "Provide a caption, an image, or both. Images must be JPG or PNG.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  caption: { type: "string" },
                  image: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Post created" }, 400: { description: "Caption or image is required" } },
      },
    },
    "/api/v1/posts/{postId}/like": {
      post: {
        tags: ["Posts"],
        summary: "Toggle like status for a post",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Post unliked" }, 201: { description: "Post liked" }, 404: { description: "Post not found" } },
      },
    },
    "/api/v1/posts/{postId}/comment": {
      post: {
        tags: ["Posts"],
        summary: "Comment on a post",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "postId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: { content: { type: "string", example: "Great post!" } },
              },
            },
          },
        },
        responses: { 201: { description: "Comment created" }, 400: { description: "Invalid post or empty comment" }, 404: { description: "Post not found" } },
      },
    },
  },
};

export default openApiSpec;