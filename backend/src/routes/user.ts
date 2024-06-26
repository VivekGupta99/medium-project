import { PrismaClient } from "@prisma/client/edge"
import { withAccelerate } from "@prisma/extension-accelerate"
import { signinInput, signupInput } from "@vg821380/common-app"
import { Hono } from "hono"
import { sign } from "hono/jwt"

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string
    JWT_SECRET: string
  }
  Variables: {
    userId: string
  }
}>()

userRouter.post("/signup", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate())

  const body = await c.req.json()
  const { success } = signupInput.safeParse(body)
  if (!success) {
    c.status(411)
    return c.json({
      message: "Inputs not correct",
    })
  }

  try {
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: body.password,
        name: body.name,
      },
    })
    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET)
    return c.json(jwt)
  } catch (e) {
    c.status(403)
    console.log(e)
    return c.json({ error: "Invalid" })
  }
})

userRouter.post("/signin", async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env?.DATABASE_URL,
  }).$extends(withAccelerate())
  try {
    const body = await c.req.json()
    const { success } = signinInput.safeParse(body)
    if (!success) {
      c.status(400)
      return c.json({ error: "invalid input" })
    }
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    })

    if (!user) {
      c.status(403)
      return c.json({ error: "user not found" })
    }

    const jwt = await sign({ id: user.id }, c.env.JWT_SECRET)
    return c.json({ jwt })
  } catch (e) {
    c.status(403)
    return c.json({ error: "error in sign In" })
  }
})
