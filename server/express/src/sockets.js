const socketUtility = (socket) => {
    socket.on("join", (userId) => {
        socket.join(userId)
        console.log("User joined with id: ", userId)
    })

    socket.on("joinChat", (chatId) => {
        socket.join(chatId)
        console.log("User joined chat with id: ", chatId)
    })

    socket.on("sendMessage", (message) => {
        const users = message.chat.users
        const receiver = users.filter(user => user !== message.sender._id)[0]
        socket.in(receiver).emit("receiveMessage", message)
        socket.emit("updateLastMessage", message.message)
    })
}

export default socketUtility