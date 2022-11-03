/* eslint-disable no-plusplus */
/* eslint-disable no-unused-vars */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const randomstring = require("randomstring");
const { Op } = require("sequelize");
const sequelize = require("../config/database/connection");
const UserService = require("../service/UserService");
const helpers = require("../helpers/message");
const EmailService = require("../service/emailService");

exports.registerUser = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { email, userType, name, captcha } = req.body;
      if (!req.body.platform) {
        const validateCaptcha = await UserService.validateCaptcha(captcha);
        if (!validateCaptcha) {
          return res.status(400).send({
            success: false,
            message: "Please answer the captcha correctly",
            validateCaptcha
          });
        }
      }

      const isUserType = UserService.validateUserType(userType);
      if (!isUserType) {
        return res.status(400).send({
          success: false,
          message: "Invalid User Entity passed"
        });
      }
      const user = await UserService.findUser({ email });

      if (user) {
        return res.status(400).send({
          success: false,
          message: "This Email is already in Use"
        });
      }

      const userData = {
        name: req.body.name,
        fname: req.body.fname,
        lname: req.body.lname,
        email: req.body.email,
        phone: req.body.phone,
        password: bcrypt.hashSync(req.body.password, 10),
        userType: req.body.userType,
        address: req.body.address,
        level: req.body.level,
        referralId: randomstring.generate(12),
        aboutUs: req.body.aboutUs
      };

      const newUser = await UserService.createNewUser(userData, t);

      // check if refferalId was passed
      if (req.body.reference && req.body.reference !== "") {
        const where = {
          referralId: {
            [Op.eq]: req.body.reference
          }
        };
        const reference = await UserService.findUser(where);
        if (reference) {
          const referenceData = {
            userId: reference.id,
            referredId: newUser.id
          };
          await UserService.createReferral(referenceData, t);
        }
      }
      const type = ["professional", "vendor", "corporate_client"];
      if (type.includes(userType)) {
        const data = {
          userId: newUser.id,
          company_name: req.body.company_name
        };
        await UserService.createProfile(data, t);
      }

      let token = helpers.generateWebToken();
      let message = helpers.verifyEmailMessage(name, email, token);
      if (req.body.platform === "mobile") {
        token = helpers.generateMobileToken();
        message = helpers.mobileVerifyMessage(name, token);
      }
      if (userType !== "admin") {
        await EmailService.sendMail(email, message, "Verify Email");
      }
      const data = {
        token,
        id: newUser.id
      };
      await UserService.updateUser(data, t);

      return res.status(201).send({
        success: true,
        message: "User Created Successfully"
      });
    } catch (error) {
      t.rollback();
      return next(error);
    }
  });
};

exports.loginUser = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { email, password } = req.body;
      const user = await UserService.findUser({ email });

      if (!user) {
        return res.status(400).send({
          success: false,
          message: "Invalid User"
        });
      }
      if (user.userType === "admin") {
        return res.status(400).send({
          success: false,
          message: "This user is not available"
        });
      }
      if (!user.isActive) {
        return res.status(400).send({
          success: false,
          message: "Please Verify account"
        });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(404).send({
          success: false,
          message: "Invalid User Details"
        });
      }
      const payload = {
        user: {
          id: user.id
        }
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: 36000
      });
      return res.status(201).send({
        success: true,
        message: "User Logged In Sucessfully",
        token,
        user
      });
    } catch (error) {
      t.rollback();
      return next(error);
    }
  });
};

exports.loginAdmin = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { email, password } = req.body;
      const user = await UserService.findUser({ email });

      if (!user) {
        return res.status(400).send({
          success: false,
          message: "Invalid User"
        });
      }
      if (user.userType !== "admin") {
        return res.status(400).send({
          success: false,
          message: "This Admin is not known"
        });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(404).send({
          success: false,
          message: "Invalid User Details"
        });
      }
      const payload = {
        user: {
          id: user.id
        }
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: 3600
      });
      return res.status(201).send({
        success: true,
        message: "Admin Logged In Sucessfully",
        token,
        user
      });
    } catch (error) {
      t.rollback();
      return next(error);
    }
  });
};

exports.getLoggedInUser = async (req, res) => {
  try {
    const user = await UserService.getUserDetails({ id: req.user.id });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "No User Found",
        user: null
      });
    }
    return res.status(200).send({
      success: true,
      user
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Server Error"
    });
  }
};

exports.verifyUser = async (req, res, next) => {
  sequelize.transaction(async transaction => {
    try {
      const { email, token } = req.query;
      const user = await UserService.findUser({ email, token });
      if (!user) {
        return res.status(404).send({
          success: false,
          message: "No User found with this email"
        });
      }

      const data = {
        id: user.id,
        isActive: true,
        token: null
      };
      await UserService.updateUser(data, transaction);
      return res.status(200).send({
        success: true,
        message: "Account Activated Successfully"
      });
    } catch (error) {
      transaction.rollback();
      return next(error);
    }
  });
};

exports.updateUserAccount = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const data = req.body;
      const userId = req.user.id;
      const user = await UserService.findUserById(userId);
      if (!user) {
        return res.status(404).send({
          success: false,
          message: "Invalid user"
        });
      }
      if (req.file) {
        data.photo = req.file.path;
      }
      data.id = userId;
      await UserService.updateUser(data, t);
      return res.status(201).send({
        success: true,
        message: "Profile Updated Successfully"
      });
    } catch (error) {
      t.rollback();
      return next(error);
    }
  });
};

exports.updateUserProfile = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const data = req.body;
      const userId = req.user.id;
      const user = await UserService.findUserById(userId);
      if (!user) {
        return res.status(404).send({
          success: false,
          message: "Invalid user"
        });
      }

      const where = {
        userId
      };
      if (user.userType === "professional") {
        let operation;
        let professional;
        for (let i = 0; i < req.files.length; i++) {
          if (req.files[i].fieldname === "operation") {
            operation = req.files[i].path;
          }
          if (req.files[i].fieldname === "professional") {
            professional = req.files[i].path;
          }
        }
        const requestData = {
          userId,
          company_name: data.company_name,
          company_address: data.company_address,
          certificate_of_operation: operation,
          professional_certificate: professional,
          years_of_experience: data.years
        };
        await UserService.updateUserProfile(requestData, where, t);
      } else if (
        user.userType === "vendor" ||
        user.userType === "corporate_client"
      ) {
        const requestData = {
          userId,
          company_name: data.company_name,
          company_address: data.company_address,
          tin: data.tin,
          cac_number: data.cac_number,
          years_of_experience: data.years
        };
        await UserService.updateUserProfile(requestData, where, t);
      }

      return res.status(201).send({
        success: true,
        message: "Profile Updated Successfully"
      });
    } catch (error) {
      t.rollback();
      return next(error);
    }
  });
};

exports.changePassword = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { id } = req.user;
      const { oldPassword, newPassword, confirmPassword } = req.body;
      if (newPassword !== confirmPassword) {
        return res.status(400).send({
          success: false,
          message: "Passwords do not match"
        });
      }

      const user = await UserService.findUserById(id);

      if (!bcrypt.compareSync(oldPassword, user.password)) {
        return res.status(400).send({
          success: false,
          message: "Incorrect Old Password"
        });
      }
      const currentPassword = bcrypt.hashSync(newPassword, 10);
      const data = {
        password: currentPassword,
        id
      };
      await UserService.updateUser(data, t);
      return res.status(200).send({
        success: true,
        message: "Password Changed Successfully"
      });
    } catch (error) {
      t.rollback();
      return next(error);
    }
  });
};

exports.forgotPassword = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { email } = req.query;

      const user = await UserService.findUser({ email });
      if (!user) {
        return res.status(404).send({
          success: false,
          message: "Invalid user"
        });
      }

      let token = helpers.generateWebToken();
      let message = helpers.resetPasswordMessage(email, token);
      if (req.body.platform === "mobile") {
        token = helpers.generateMobileToken();
        message = helpers.resetPasswordMobileMessage(token);
      }
      await EmailService.sendMail(email, message, "Reset Password");
      const data = {
        token,
        id: user.id
      };
      await UserService.updateUser(data, t);
      return res.status(200).send({
        success: true,
        message: "Password Reset Email Sent Successfully"
      });
    } catch (error) {
      t.rollback();
      return next(error);
    }
  });
};

exports.resetPassword = async (req, res, next) => {
  sequelize.transaction(async t => {
    try {
      const { email, token, password } = req.body;

      const user = await UserService.findUser({ token, email });
      if (!user) {
        return res.status(404).send({
          success: false,
          message: "Invalid user"
        });
      }

      const currentPassword = bcrypt.hashSync(password, 10);
      const data = {
        password: currentPassword,
        id: user.id
      };
      await UserService.updateUser(data, t);
      return res.status(200).send({
        status: true,
        message: "Password Changed Successfully"
      });
    } catch (error) {
      t.rollback();
      return next(error);
    }
  });
};

exports.resendCode = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserService.findUser({ email });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "No User found with this email"
      });
    }

    let token = helpers.generateWebToken();
    let message = helpers.verifyEmailMessage(user.name, email, token);
    if (req.body.platform === "mobile") {
      token = helpers.generateMobileToken();
      message = helpers.mobileVerifyMessage(user.name, token);
    }

    await EmailService.sendMail(email, message, "Verify Email");
    const data = {
      token,
      id: user.id
    };
    await UserService.updateUser(data);

    return res.status(200).send({
      success: true,
      message: "Token Sent check email or mobile number"
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Server Error"
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const user = await UserService.getUserDetails({ id: req.user.id });
    if (!user) {
      return res.status(404).send({
        success: false,
        message: "No User Found"
      });
    }
    if (user.level === 1) {
      return res.status(401).send({
        success: false,
        message: "UnAuthorised access"
      });
    }
    const where = {
      level: 1
    };
    const users = await UserService.getAllUsers(where);
    return res.status(200).send({
      success: true,
      users
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Server Error"
    });
  }
};
