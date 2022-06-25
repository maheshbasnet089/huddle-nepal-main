const User = require("../model/userModel");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const sendMail = require("../utils/email");
const { createHash } = require("crypto");

const signinToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
const cookieOptions = {
  expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  httpOnly: true,
};
if (process.env.NODE_ENV === "production") cookieOptions.secure = true;
const createToken = (user, statusCode, res) => {
  const token = signinToken(user._id);
  //send cookie in response with token in it

  res.cookie("jwt", token, cookieOptions);
  user.password = undefined;
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signUp = async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    email: req.body.email,
    role: req.body.role,
    passwordChangedAt: req.body.passwordChangedAt,
  });
  createToken(newUser, 201, res);
};

exports.logIn = async (req, res, next) => {
  const { email, password } = req.body;
  //check email or password provided or not
  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      message: "Please ",
    });
  }
  //if provided check if user and exists and passsword is correct
  const user = await User.findOne({ email: email }).select("+password");
  if (!user || !(await user.comparePassword(password, user.password))) {
    // comparePassword method is coming from model
    return res.status(400).json({
      status: "error",
      message: "Invalid Email or Password",
    });
  }
  createToken(user, 201, res);
};

exports.protectMiddleware = async (req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  let token;
  if (authorizationHeader && authorizationHeader.startsWith("Bearer")) {
    token = authorizationHeader.split(" ")[1]; // only extracts the token
  }
  if (!token) {
    res.status(401).send("You must be logged In");
  }
  //verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET); // with promisify no need to use jwt.verify callbacks,returns user
  const currentUser = await User.findById(decoded.id);
  // console.log(await User.findById("629f3c234167a0f7011a9ef7"));
  if (!currentUser) {
    return res
      .status(401)
      .send("The user belonging to this token doesn't exist");
  }

  //check if user changed password after token was issued
  if (currentUser.passwordChangedAfter(decoded.iat)) {
    return res.status(401).send("Password was changed, please login again");
  }
  //if all goes well , grant access to the protected route
  req.user = currentUser;
  next();
};

exports.get = (req, res, next) => {
  res.status(200).json({
    status: "success",
    message: "Get(test) route ",
  });
};

exports.forgotPassword = async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    res.status(400).send("No user with that Email Address");
  }
  //create reset token
  const resetToken = user.createResetToken();
  await user.save({ validateBeforeSave: false });

  //send Email to that email adress
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password ? Submit a patch request with your new password and password confirm to 
  :${resetUrl}. \n If you don't forget your password , please ignore this email! `;
  try {
    await sendMail({
      email: user.email,
      subject: "Your password reset token (only valid for 10 minutes)",
      message,
    });
    res.status(200).json({
      status: "sucess",
      message: "Email sent Sucessfully",
    });
  } catch (e) {
    console.log(e);
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiresIn = undefined;
    await user.save({ validateBeforeSave: false });
    return res.status(500).send("Some Internal Error Occured!");
  }
};

exports.resetPassword = async (req, res, next) => {
  const notHashedToken = req.params.token;
  const hashedToken = createHash("sha256").update(notHashedToken).digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpiresIn: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).send("Token is incorrect or expired");
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetTokenExpiresIn = undefined;
  user.passwordResetToken = undefined;
  await user.save();
  //sign in token
  createToken(user, 201, res);
};

exports.updatePassword = async (req, res, next) => {
  //find user from req object
  const user = await User.findById(req.user._id).select("+password");
  const currentPassword = req.body.currentPassword;
  if (!(await user.comparePassword(currentPassword, user.password))) {
    return res.status(401).send("Please Enter correct Password");
  }
  //if password matches update
  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save(); // we do .save() but not findBYIDAndupdate because there is no validation in findbyidandupdate and presave hooks does not come inton action
  createToken(user, 200, res);
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(401)
        .send("You don't have permissin to access this route");
    }
    next();
  };
};
