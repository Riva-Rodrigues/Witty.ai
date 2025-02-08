import mongoose from "mongoose"

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_DB_URI}`)
        console.log(`MongoDB connected! DB host ${connectionInstance.connection.host}`)
    } catch(error) {
        console.log(error, "\nThere was an error in the connection of mongoDB")
        process.exit(1)
    }
}

export default connectDB