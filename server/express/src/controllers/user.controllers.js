import User from '../models/user.models.js'

const isEmailValid = (email) => {
    const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
    return regex.test(email)
}

export const registerUser = async(req, res) => {
    try {
        const { name, email } = req.body

        if(!name) {
            return res.status(400).json({message: 'Name is required'})
        }

        if(!email || !isEmailValid(email)) {
            return res.status(400).json({message: 'Email is required and must be a valid email address.'})
        }

        const userExist = await User.findOne({email})
        if(userExist) {
            return res.status(400).json({message: 'User already exists with this email address.'})
        }

        const user = await User.create({
            name,
            email
        })

        const createdUser = await User.findById(user._id)

        if(!createdUser) {
            return res.status(500).json({error: "Something went wrong while registering the user"})
        }

        return res.status(200).json({user: createdUser, message: "User created successfully"})

    } catch (error) {
        console.log(error.message)
        return res.status(500).json({message: error.message})
    }
}

export const getCurrentUser = async(req, res) => {
    try {
        const user = req.user
        return res.status(200).json({user})
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({message: "Something went wrong while fetching the user."})
    }
}

export const getUserById = async(req, res) => {
    try {
        const userId = req.params.id
        const user = await User.findById(userId)
        return res.status(200).json({user})
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({message: "Something went wrong while fetching the user."})
    }
}