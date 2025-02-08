import express from "express"
import { registerUser, getCurrentUser, getUserById } from "../controllers/user.controllers.js"

const router = express.Router()

router.post("/register", registerUser)

router.get("/me", getCurrentUser)

router.get("/users/:id", getUserById)

export default router