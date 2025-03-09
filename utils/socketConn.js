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
					transports: ["websocket", "polling"]
				},
				pingTimeout: 60000,
				pingInterval: 25000
			});


			io.use(async (socket, next) => {
				try {
					const token = socket.handshake.auth.token;
					if (!token) {
						return next(new Error('Authentication error'));
					}
					next();
				} catch (error) {
					next(new Error('Authentication error'));
				}
			});

			io.on("connection", async (socket) => {
				console.log(`Client connected: ${socket.id}`);

				socket.on("activeUser", async (data) => {
					try {
						const { userId } = data;
						if (!userId) return;

						const userData = {
							userId,
							socketId: socket.id,
							isLoggedin: true,
							lastActive: new Date()
						};

						await activeUser.updateOne(
							{ userId },
							{ $set: userData },
							{ upsert: true }
						);

						socket.join(userId.toString());

						const [notifications, matches] = await Promise.all([
							Notification.countDocuments({
								isRead: false,
								userId
							}),
							Match.find({
								users: userId,
								status: 'pending'
							})
						]);

						socket.emit("counts", {
							notifications,
							pendingMatches: matches.length
						});
					} catch (error) {
						console.error("Active user error:", error);
					}
				});

				socket.on("acceptMatch", async (data) => {
					try {
						const { matchId, userId } = data;
						const match = await Match.findById(matchId);
						
						if (!match) return;

						match.acceptedBy.addToSet(userId);
						
						if (match.acceptedBy.length === 2) {
							match.status = 'accepted';
							match.chatEnabled = true;

							// Create database notifications for both users
							const notifications = match.users.map(user => ({
								userId: user,
								type: 'match',
								title: 'Match Accepted!',
								message: 'You can now chat with your match!',
								data: {
									matchId: match._id,
									userId: user === userId ? match.users.find(u => u !== userId) : userId
								}
							}));

							await Notification.insertMany(notifications);

							// Send real-time notifications
							for (const user of match.users) {
								io.to(user.toString()).emit("matchAccepted", {
									matchId,
									notification: notifications.find(n => n.userId.equals(user))
								});
							}

							// Send push notifications to both users
							const users = await User.find({ _id: { $in: match.users } });
							for (const user of users) {
								if (user.fcmTokens?.length > 0) {
									await sendPushNotification(
										user.fcmTokens.map(t => t.token),
										'Match Accepted!',
										'You can now chat with your match!',
										{
											type: 'match_accepted',
											matchId: match._id.toString()
										}
									);
								}
							}

							await notificationService.sendNotification(
								match.users,
								'Match Complete!',
								'You can now chat with your match!',
								{
									type: NOTIFICATION_TYPES.MATCH_COMPLETE,
									matchId: match._id.toString()
								}
							);
						} else {
							// Notify other user that this user has accepted
							const otherUser = match.users.find(u => u.toString() !== userId.toString());
							
							await Notification.create({
								userId: otherUser,
								type: 'match',
								title: 'Match Update',
								message: 'Someone accepted your match! Accept back to start chatting.',
								data: {
									matchId: match._id,
									userId: userId
								}
							});

							io.to(otherUser.toString()).emit("matchUpdateReceived", {
								matchId,
								status: 'pending_acceptance'
							});

							// Send push notification to other user
							if (otherUser.fcmTokens?.length > 0) {
								await sendPushNotification(
									otherUser.fcmTokens.map(t => t.token),
									'Match Update',
									'Someone accepted your match! Accept back to start chatting.',
									{
										type: NOTIFICATION_TYPES.MATCH_ACCEPTED,
										matchId: match._id.toString()
									}
								);
							}
						}

						await match.save();
					} catch (error) {
						console.error("Match acceptance error:", error);
					}
				});

				socket.on("sendMessage", async (data) => {
					try {
						const { matchId, text, senderId, clientMessageId } = data;
						const match = await Match.findById(matchId);

						if (!match || !match.chatEnabled) {
							socket.emit("messageStatus", {
								clientMessageId,
								status: 'failed',
								error: 'Chat not enabled'
							});
							return;
						}

						const message = await Message.create({
							matchId,
							sender: senderId,
							text,
							readBy: [senderId],
							clientMessageId,
							status: 'sent'
						});

						match.lastMessage = {
							text,
							sender: senderId,
							timestamp: new Date()
						};
						await match.save();

						// Confirm to sender
						socket.emit("messageStatus", {
							clientMessageId,
							messageId: message._id,
							status: 'sent',
							timestamp: message.createdAt
						});

						// Send to other users
						match.users.forEach(userId => {
							if (userId.toString() !== senderId.toString()) {
								io.to(userId.toString()).emit("newMessage", {
									matchId,
									message: {
										...message.toObject(),
										sender: senderId
									}
								});
							}
						});

						// Send push notification to other user
						const otherUser = await User.findById(
							match.users.find(u => u.toString() !== senderId.toString())
						);
						
						if (otherUser.fcmTokens?.length > 0) {
							await sendPushNotification(
								otherUser.fcmTokens.map(t => t.token),
								'New Message',
								text.substring(0, 100), // First 100 chars of message
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
							clientMessageId,
							status: 'failed',
							error: error.message
						});
					}
				});

				socket.on("messageRead", async (data) => {
					try {
						const { messageId, userId } = data;
						const message = await Message.findById(messageId);
						
						if (!message) return;

						message.readBy.addToSet(userId);
						await message.save();

						io.to(message.sender.toString()).emit("messageReadStatus", {
							messageId,
							readBy: message.readBy
						});
					} catch (error) {
						console.error("Message read status error:", error);
					}
				});

				socket.on("messageDelivered", async (data) => {
					try {
						const { messageId, userId } = data;
						const message = await Message.findById(messageId);
						
						if (!message) return;

						message.status = 'delivered';
						await message.save();

						// Notify sender
						io.to(message.sender.toString()).emit("messageStatus", {
							messageId,
							clientMessageId: message.clientMessageId,
							status: 'delivered'
						});
					} catch (error) {
						console.error("Message delivery status error:", error);
					}
				});

				socket.on("disconnected", async (data) => {
					try {
						if (data?.userId) {
							await activeUser.findOneAndUpdate(
								{ userId: data.userId },
								{
									isLoggedin: false,
									socketId: null,
									lastActive: new Date()
								}
							);
						}
					} catch (error) {
						console.error("Disconnection error:", error);
					}
				});

				socket.on("disconnect", async () => {
					console.log(`Client disconnected: ${socket.id}`);
				});

				resolve(socket);
			});
		} catch (error) {
			console.error("Error creating socket:", error);
			reject(error);
		}
	});
};
