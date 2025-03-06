'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('salons', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: '-', // 기존 데이터를 위한 임시 기본값
      comment: '미용실 연락처'
    });

    await queryInterface.addColumn('salons', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: '미용실 소개 및 설명'
    });

    // 기존 데이터에 대한 임시 기본값 설정 후, Not Null 제약 조건을 적용하려면
    // 먼저 기본값을 채우고 나서 제약 조건을 변경해야 합니다.
    // 필요하다면 아래 주석을 해제하고 사용하세요
    /*
    await queryInterface.changeColumn('salons', 'phone', {
      type: Sequelize.STRING(20),
      allowNull: false,
      comment: '미용실 연락처'
    });
    */
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('salons', 'phone');
    await queryInterface.removeColumn('salons', 'description');
  }
};