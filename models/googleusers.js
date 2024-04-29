'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class googleUsers extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      googleUsers.hasMany(models.sessions, { foreignKey: 'userId' });
    }
  }
  googleUsers.init({
    name: {
      type: DataTypes.STRING
    },
    email: {
      allowNull: false,
      type: DataTypes.STRING
    },
    password: {
      type: DataTypes.STRING
    },
    email_verified: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    nickname: {
      type: DataTypes.STRING
    },
    picture: {
      type: DataTypes.STRING
    },
    sub: {
      allowNull: false,
      type: DataTypes.STRING
    },
    googleToken: {
      allowNull: false,
      type: DataTypes.STRING
    },
    uuid: {
      allowNull: false,
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4
    },
    token: {
      allowNull: false,
      type: DataTypes.UUID,
    },
  }, {
    sequelize,
    modelName: 'googleUsers',
  });
  return googleUsers;
};