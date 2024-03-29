import { PrismaClient } from "@prisma/client/edge"
import { withAccelerate } from "@prisma/extension-accelerate"
import { Hono } from "hono"
import { verify } from "hono/jwt"

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
  }
  Variables: {
    userId: string
  }
}>()

blogRouter.use("/*", async (c, next) => {
  const jwt = c.req.header("Authorization")
  try {
    if (!jwt) {
      c.status(401)
      return c.json({ message: "unauthorized" })
    }
    const token = jwt.split(" ")[1]
    const payload = await verify(token, c.env.JWT_SECRET)
    if (!payload) {
      c.status(401)
      return c.json({ error: "unauthorized" })
    }
    c.set("userId", payload.id)
    await next()
  } catch (error) {
    c.status(403)
    return c.json({ message: "You are not logged in" })
  }
})

blogRouter.post("/", async (c) => {
  const body = await c.req.json()
  const userId = c.get("userId")
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate())

  const blog = await prisma.post.create({
    data: {
      title: body.title,
      content: body.content,
      authorId: userId,
    },
  })
  return c.json({
    id: blog.id,
  })
})

blogRouter.put("/", async (c) => {
  const body = await c.req.json()
  const userId = c.get("userId")
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate())

  const blog = await prisma.post.update({
    where: {
      id: body.id,
      authorId: userId,
    },
    data: {
      title: body.title,
      content: body.content,
    },
  })
  return c.text("updated post")
})

blogRouter.get("/bulk", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate())

  const blogs = await prisma.post.findMany()

  return c.json(blogs)
})

blogRouter.get("/:id", async (c) => {
  const id = c.req.param("id")
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate())

  const blog = await prisma.post.findUnique({ where: { id } })
  return c.json(blog)
})
