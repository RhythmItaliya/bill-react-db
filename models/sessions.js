'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class sessions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      sessions.belongsTo(models.googleUsers, { foreignKey: 'userId' });
      sessions.belongsTo(models.users, { foreignKey: 'userId' });
    }
  }
  sessions.init({
    sessionId: {
      allowNull: false,
      type: DataTypes.STRING
    },
    userId: {
      allowNull: false,
      type: DataTypes.INTEGER
    },
    expires: {
      allowNull: false,
      type: DataTypes.TIME
    },
    data: {
      allowNull: false,
      type: DataTypes.TEXT
    },
    sessionEnd: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    sequelize,
    modelName: 'sessions',
  });
  return sessions;
};