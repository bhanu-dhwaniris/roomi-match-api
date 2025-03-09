const { catchAsync } = require("../utils/commonFunctions");

updateOneSignalId: catchAsync(async (req, res) => {
    const userId = req.user._id;
    const { playerId, device } = req.body;

    if (!playerId || !device) {
        return res.BadRequest({}, 'Player ID and device are required');
    }

    // Remove old player ID for this device
    await User.findByIdAndUpdate(userId, {
        $pull: {
            oneSignalIds: { device }
        }
    });

    // Add new player ID
    await User.findByIdAndUpdate(userId, {
        $push: {
            oneSignalIds: {
                playerId,
                device,
                lastUsed: new Date()
            }
        }
    });

    return res.Ok({}, 'OneSignal ID updated successfully');
}) 