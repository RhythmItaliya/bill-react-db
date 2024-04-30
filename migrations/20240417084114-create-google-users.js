'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('googleUsers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING
      },
      email: {
        allowNull: false,
        type: Sequelize.STRING
      },
      password: {
        type: Sequelize.STRING
      },
      email_verified: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      nickname: {
        type: Sequelize.STRING
      },
      picture: {
        type: Sequelize.STRING
      },
      sub: {
        type: Sequelize.STRING
      },
      googleToken: {
        type: Sequelize.STRING
      },
      setPassword: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      setNickname: {
        allowNull: false,
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      uuid: {
        allowNull: false,
        type: Sequelize.UUID
      },
      token: {
        allowNull: false,
        type: Sequelize.UUID
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('googleUsers');
  }
};