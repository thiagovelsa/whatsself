import { Hono } from "hono";

type Env = Record<string, never>;

const app = new Hono<{ Bindings: Env }>();

export default app;
