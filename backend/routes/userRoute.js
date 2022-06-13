const router = require("express").Router();
const authController = require("../controllers/authController");
const userController = require("../controllers/userController");

router.route("/signup").post(authController.signUp);
router.route("/login").post(authController.logIn);
router.route("/forgotpassword").post(authController.forgotPassword);
router.route("/resetPassword/:token").patch(authController.resetPassword);

//router level middleware which runs on every request after this middleware line
router.use(authController.protectMiddleware);

router.route("/updateMyPassword").patch(authController.updatePassword);
// for user

router.route("/me").get(userController.getMe, userController.getUser);
router.route("/updateMe").patch(userController.updateMe);
router.route("/deleteMe").delete(userController.deleteMe);

//restricted to admin
router.use(authController.restrictTo("admin"));
router.route("/").get(userController.getAllUser);
router
  .route("/:id")
  .get(userController.getUser)
  .patch(authController.protectMiddleware, userController.updateUser)
  .delete(userController.deleteUser);
module.exports = router;
