const { Server } = require("socket.io");
const activeUser = require("../models/socket");
const Match = require("../models/Match");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendPushNotification } = require('./firebaseService');
const { NOTIFICATION_TYPES } = require('./constants');

exports.createSocket = async (server) => {
	return new Promise((resolve, reject) => {
		try {
			const io = new Server(server, {
				cors: {
					origin: process.env.CLIENT_URL || "http://localhost:3000",
					methods: ["GET", "POST"],
					credentials: true,
					transports: ["websocket", "polling"],
					allowedHeaders: ["Content-Type", "Authorization"]
				},
				pingTimeout: 60000,
				pingInterval: 25000,
				path: '/chat',
				allowEIO3: true,
				allowUpgrades: true
			});

			io.use(async (socket, next) => {
				try {
					const userId = socket.handshake.query.userId;
					if (!userId) {
						return next(new Error('User ID is required'));
					}
					socket.userId = userId;
					next();
				} catch (error) {
					next(new Error('Authentication error'));
				}
			});

			io.on("connection", async (socket) => {
				console.log(`Client connected: ${socket.id} for user: ${socket.userId}`);

				// Join user's personal room
				socket.join(socket.userId);

				// Update active user status
				await activeUser.updateOne(
					{ userId: socket.userId },
					{ 
						$set: {
							socketId: socket.id,
							isLoggedin: true,
							lastActive: new Date()
						}
					},
					{ upsert: true }
				);

				// Get initial counts
				const [notifications, matches] = await Promise.all([
					Notification.countDocuments({
						isRead: false,
						userId: socket.userId
					}),
					Match.find({
						users: socket.userId,
						status: 'pending'
					})
				]);

				socket.emit("counts", {
					notifications,
					pendingMatches: matches.length
				});

				// Handle new messages
				socket.on("message", async (data) => {
					try {
						const { matchId, content, senderId } = data;
						const match = await Match.findById(matchId);

						if (!match || !match.chatEnabled) {
							socket.emit("messageStatus", {
								status: 'failed',
								error: 'Chat not enabled'
							});
							return;
						}

						const message = await Message.create({
							matchId,
							sender: senderId,
							content,
							readBy: [senderId],
							status: 'sent'
						});

						// Update match's last message
						match.lastMessage = {
							content,
							sender: senderId,
							timestamp: new Date()
						};
						await match.save();

						// Emit to all users in the match
						match.users.forEach(userId => {
							io.to(userId.toString()).emit("message", {
								type: "message",
								data: {
									id: message._id,
									content: message.content,
									senderId: message.sender,
									timestamp: message.createdAt,
									matchId: message.matchId
								}
							});
						});

						// Send push notification to other user
						const otherUser = await User.findById(
							match.users.find(u => u.toString() !== senderId.toString())
						);
						
						if (otherUser?.fcmTokens?.length > 0) {
							await sendPushNotification(
								otherUser.fcmTokens.map(t => t.token),
								'New Message',
								content.substring(0, 100),
								{
									type: 'new_message',
									matchId: match._id.toString(),
									messageId: message._id.toString()
								}
							);
						}
					} catch (error) {
						console.error("Message sending error:", error);
						socket.emit("messageStatus", {
							status: 'failed',
							error: error.message
						});
					}
				});

				// Handle disconnection
				socket.on("disconnect", async () => {
					console.log(`Client disconnected: ${socket.id}`);
					await activeUser.updateOne(
						{ userId: socket.userId },
						{ 
							$set: {
								isLoggedin: false,
								lastActive: new Date()
							}
						}
					);
				});
			});

			resolve(io);
		} catch (error) {
			reject(error);
		}
	});
};
