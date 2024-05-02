'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class users extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      users.hasMany(models.sessions, { foreignKey: 'userId' });
      users.hasMany(models.otps, { foreignKey: 'userId' });
    }
  }
  users.init({
    name: {
      type: DataTypes.STRING
    },
    username: {
      type: DataTypes.STRING
    },
    email: {
      allowNull: false,
      type: DataTypes.STRING
    },
    password: {
      allowNull: false,
      type: DataTypes.STRING
    },
    email_verified: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    picture: {
      type: DataTypes.STRING
    },
    setPassword: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    setUsername: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    token: {
      allowNull: false,
      type: DataTypes.UUID
    },
    uuid: {
      allowNull: false,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    auth: {
      allowNull: false,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV1
    },
  }, {
    sequelize,
    modelName: 'users',
  });
  return users;
};