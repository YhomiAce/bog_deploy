const Sequelize = require("sequelize");
const sequelise = require("../config/database/connection");
const BankDetail = require("./BankDetail");
const UserConnector = require("./UserConnector");
const UserProfile = require("./UserProfile");

const User = sequelise.define(
  "users",
  {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      unique: true,
      primaryKey: true
    },
    name: {
      type: Sequelize.STRING,
      allowNull: true
    },
    email: {
      type: Sequelize.STRING,
      allowNull: true,
      unique: true
    },
    password: {
      type: Sequelize.STRING,
      allowNull: true
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: true
    },
    isActive: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    token: {
      type: Sequelize.STRING,
      allowNull: true
    },
    userType: {
      type: Sequelize.ENUM(
        "professional",
        "vendor",
        "private_client",
        "corporate_client"
      ),
      allowNull: true
    },
    address: {
      type: Sequelize.STRING,
      allowNull: true
    },
    state: {
      type: Sequelize.STRING,
      allowNull: true
    },
    city: {
      type: Sequelize.STRING,
      allowNull: true
    },
    street: {
      type: Sequelize.STRING,
      allowNull: true
    }
  },
  { paranoid: true }
);

User.hasOne(BankDetail, {
  foreignKey: "userId",
  as: "bank_detail",
  onDelete: "cascade",
  hooks: true
});

User.hasOne(UserProfile, {
  foreignKey: "userId",
  as: "profile",
  onDelete: "cascade",
  hooks: true
});

User.hasMany(UserConnector, {
  foreignKey: "userId",
  as: "connectors",
  onDelete: "cascade",
  hooks: true
});

module.exports = User;
