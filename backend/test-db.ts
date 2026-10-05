import { sequelize } from './src/db';

async function test() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    const rooms = await sequelize.models.Room.findAll();
    console.log(rooms);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

test();
