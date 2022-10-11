const Sequelize = require("sequelize");
const sequelise = require("../config/database/connection");

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
    entity: {
      type: Sequelize.ENUM(
        "service_partner",
        "product_partner",
        "private_client",
        "corporate_client"
      ),
      allowNull: true
    },
    address: {
      type: Sequelize.STRING,
      allowNull: true
    },
    company_name: {
      type: Sequelize.STRING,
      allowNull: true
    },
    cac_number: {
      type: Sequelize.STRING,
      allowNull: true
    },
    tin: {
      type: Sequelize.STRING,
      allowNull: true
    },
    years_of_experience: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    certificate_of_operation: {
      type: Sequelize.STRING,
      allowNull: true
    },
    professional_certificate: {
      type: Sequelize.STRING,
      allowNull: true
    }
  },
  { paranoid: true }
);

module.exports = User;
