import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { randomUUID } from 'node:crypto';

describe('API Integration Tests', () => {
  let app: Express;

  const TEST_API_DB_URL =
    process.env.TEST_API_DATABASE_URL ||
    process.env.TEST_DATABASE_URL ||
    'postgresql://postgres:postgrespassword@localhost:55432/whatsself_test_api?schema=test_api';

  const apiPrisma = new PrismaClient({
    datasources: {
      db: {
        url: TEST_API_DB_URL
      }
    }
  });

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = TEST_API_DB_URL;

    const { createServer } = await import('../server.js');
    // Create server instance
    const server = await createServer();
    app = server.app;

    // Clean database
    await apiPrisma.message.deleteMany();
    await apiPrisma.flowInstance.deleteMany();
    await apiPrisma.flowStep.deleteMany();
    await apiPrisma.flow.deleteMany();
    await apiPrisma.trigger.deleteMany();
    await apiPrisma.template.deleteMany();
    await apiPrisma.contact.deleteMany();
    await apiPrisma.user.deleteMany();

  });

  afterAll(async () => {
    await apiPrisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await apiPrisma.message.deleteMany();
    await apiPrisma.flowInstance.deleteMany();
    await apiPrisma.flowStep.deleteMany();
    await apiPrisma.flow.deleteMany();
    await apiPrisma.trigger.deleteMany();
    await apiPrisma.template.deleteMany();
    await apiPrisma.contact.deleteMany();
    await apiPrisma.user.deleteMany();
  });

  const generateEmail = (prefix: string) => `${prefix}.${randomUUID()}@test.com`;

  const registerUser = async ({
    email,
    password,
    name,
    role = UserRole.operator
  }: {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
  }) => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password, name, role });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    return res.body as { user: unknown; token: string };
  };

  const createAdmin = async () => {
    const email = generateEmail('admin');
    const password = 'Admin!1234';
    await registerUser({
      email,
      password,
      name: 'Admin User',
      role: UserRole.admin
    });
    const loginRes = await loginUser(email, password);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    return { token: loginRes.body.token as string, email, password };
  };

  const createOperator = async () => {
    const email = generateEmail('operator');
    const password = 'Operator!1234';
    await registerUser({
      email,
      password,
      name: 'Operator User',
      role: UserRole.operator
    });
    const loginRes = await loginUser(email, password);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    return { token: loginRes.body.token as string, email, password };
  };

  const loginUser = async (email: string, password: string) => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password });

    return res;
  };

  describe('Auth Endpoints', () => {
    describe('POST /auth/register', () => {
      it('should register a new user', async () => {
        const email = generateEmail('newuser');
        const res = await request(app)
          .post('/auth/register')
          .send({
            email,
            password: 'Password!123',
            name: 'New User'
          });

        expect(res.status).toBe(201);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.email).toBe(email);
        expect(res.body.token).toBeDefined();
      });

      it('should reject invalid email format', async () => {
        const res = await request(app)
          .post('/auth/register')
          .send({
            email: 'invalid-email',
            password: 'Password!123',
            name: 'Test User'
          });

        expect(res.status).toBe(400);
      });

      it('should reject duplicate email', async () => {
        const email = generateEmail('duplicate');
        await registerUser({
          email,
          password: 'Password!123',
          name: 'Original User'
        });

        const res = await request(app)
          .post('/auth/register')
          .send({
            email,
            password: 'Password!123',
            name: 'Duplicate'
          });

        expect(res.status).toBe(400);
      });
    });

    describe('POST /auth/login', () => {
      it('should login with valid credentials', async () => {
        const email = generateEmail('login');
        const password = 'Login!1234';
        await registerUser({
          email,
          password,
          name: 'Login User'
        });

        const res = await request(app)
          .post('/auth/login')
          .send({
            email,
            password
          });

        expect(res.status).toBe(200);
        expect(res.body.user).toBeDefined();
        expect(res.body.token).toBeDefined();
      });

      it('should reject invalid password', async () => {
        const email = generateEmail('login-invalid');
        await registerUser({
          email,
          password: 'Valid!1234',
          name: 'Invalid Password User'
        });

        const res = await request(app)
          .post('/auth/login')
          .send({
            email,
            password: 'wrongpassword'
          });

        expect(res.status).toBe(401);
      });

      it('should reject non-existent user', async () => {
        const res = await request(app)
          .post('/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'password123'
          });

        expect(res.status).toBe(401);
      });
    });

    describe('GET /auth/me', () => {
      it('should return current user with valid token', async () => {
        const email = generateEmail('authme');
        const password = 'Authme!1234';
        const { token } = await registerUser({
          email,
          password,
          name: 'Auth Me User'
        });

        const res = await request(app)
          .get('/auth/me')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe(email);
      });

      it('should reject without token', async () => {
        const res = await request(app).get('/auth/me');

        expect(res.status).toBe(401);
      });

      it('should reject with invalid token', async () => {
        const res = await request(app)
          .get('/auth/me')
          .set('Authorization', 'Bearer invalid-token');

        expect(res.status).toBe(401);
      });
    });
  });

  describe('Template Endpoints', () => {
    describe('POST /templates', () => {
      it('should create a new template', async () => {
        const { token } = await createAdmin();
        const res = await request(app)
          .post('/templates')
          .set('Authorization', `Bearer ${token}`)
          .send({
            key: 'welcome',
            content: 'Hello {{name}}!',
            variables: ['name']
          });

        expect(res.status).toBe(201);
        expect(res.body.key).toBe('welcome');
        expect(res.body.content).toBe('Hello {{name}}!');
      });

      it('should reject without authentication', async () => {
        const res = await request(app)
          .post('/templates')
          .send({
            key: 'welcome',
            content: 'Hello!',
          });

        expect(res.status).toBe(401);
      });

      it('should reject duplicate key', async () => {
        const { token } = await createAdmin();
        await request(app)
          .post('/templates')
          .set('Authorization', `Bearer ${token}`)
          .send({
            key: 'welcome',
            content: 'Hello!'
          });

        const res = await request(app)
          .post('/templates')
          .set('Authorization', `Bearer ${token}`)
          .send({
            key: 'welcome',
            content: 'Hi there!'
          });

        expect(res.status).toBe(409);
      });
    });

    describe('GET /templates', () => {
      let adminToken: string;

      beforeEach(async () => {
        ({ token: adminToken } = await createAdmin());
        await request(app)
          .post('/templates')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ key: 'template1', content: 'Content 1' });

        await request(app)
          .post('/templates')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ key: 'template2', content: 'Content 2' });
      });

      it('should list all templates', async () => {
        const res = await request(app)
          .get('/templates')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body).toHaveLength(2);
      });
    });

    describe('PUT /templates/:id', () => {
      it('should update a template', async () => {
        const { token } = await createAdmin();
        const createRes = await request(app)
          .post('/templates')
          .set('Authorization', `Bearer ${token}`)
          .send({ key: 'test', content: 'Original' });

        const updateRes = await request(app)
          .put(`/templates/${createRes.body.id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ content: 'Updated content' });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.content).toBe('Updated content');
      });
    });

    describe('DELETE /templates/:id', () => {
      it('should delete a template', async () => {
        const { token } = await createAdmin();
        const createRes = await request(app)
          .post('/templates')
          .set('Authorization', `Bearer ${token}`)
          .send({ key: 'test', content: 'Content' });

        const deleteRes = await request(app)
          .delete(`/templates/${createRes.body.id}`)
          .set('Authorization', `Bearer ${token}`);

        expect(deleteRes.status).toBe(204);

        const getRes = await request(app)
          .get(`/templates/${createRes.body.id}`)
          .set('Authorization', `Bearer ${token}`);

        expect(getRes.status).toBe(404);
      });
    });
  });

  describe('System Endpoints', () => {
    describe('GET /health', () => {
      it('should return health status without auth', async () => {
        const res = await request(app).get('/health');

        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
      });
    });

    describe('GET /status', () => {
      it('should return system status with auth', async () => {
        const { token } = await createAdmin();
        const res = await request(app)
          .get('/status')
          .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.whatsapp).toBeDefined();
        expect(res.body.queue).toBeDefined();
        expect(res.body.circuitBreaker).toBeDefined();
      });

      it('should reject status without auth', async () => {
        const res = await request(app).get('/status');

        expect(res.status).toBe(401);
      });
    });
  });

  describe('Admin Endpoints', () => {
    describe('GET /admin/users', () => {
      it('should allow admin to list users', async () => {
        const { token: adminToken } = await createAdmin();
        await createOperator();

        const res = await request(app)
          .get('/admin/users')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      it('should reject operator from listing users', async () => {
        const { token: adminToken } = await createAdmin();
        const { token: operatorToken } = await createOperator();

        const res = await request(app)
          .get('/admin/users')
          .set('Authorization', `Bearer ${operatorToken}`);

        expect(res.status).toBe(403);
      });
    });
  });
});
