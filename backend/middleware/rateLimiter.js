import ratelimit from "../config/upstash.js";

const rateLimiter = async(req, res, next) => {

  try {
    //here we just kept it simple
    //in a real world app you'd like to put the userId or ipAddress as your key for the my rate limit
    const { success } = await ratelimit.limit("my-rate-limit")

    if (!success){
      return res.status(429).json({
        message: "Too many request, Please try again later."
      });
    }

    next();

  } catch (error) {
    console.log("Rate Limit error", error)
    next(error)
  }
}

export default rateLimiter;

