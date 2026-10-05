import { Sequelize, DataTypes, Model, Optional } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/booking_db', {
  logging: false,
});

export interface RoomAttributes {
  id: number;
  name: string;
  capacity: number;
  floor: number;
  amenities: string;
}

export interface RoomCreationAttributes extends Optional<RoomAttributes, 'id'> {}

export class Room extends Model<RoomAttributes, RoomCreationAttributes> implements RoomAttributes {
  declare id: number;
  declare name: string;
  declare capacity: number;
  declare floor: number;
  declare amenities: string;
}

Room.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  floor: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  amenities: {
    type: DataTypes.TEXT,
  }
}, {
  sequelize,
  tableName: 'rooms',
  timestamps: false,
});

export interface BookingAttributes {
  id: number;
  room_id: number;
  title: string;
  organizer_email: string;
  attendees: number;
  start_time: Date;
  end_time: Date;
  status: string;
  created_at?: Date;
}

export interface BookingCreationAttributes extends Optional<BookingAttributes, 'id' | 'status' | 'created_at'> {}

export class Booking extends Model<BookingAttributes, BookingCreationAttributes> implements BookingAttributes {
  declare id: number;
  declare room_id: number;
  declare title: string;
  declare organizer_email: string;
  declare attendees: number;
  declare start_time: Date;
  declare end_time: Date;
  declare status: string;
  declare created_at: Date;
}

Booking.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Room,
      key: 'id'
    }
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  organizer_email: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  attendees: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'confirmed',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  tableName: 'bookings',
  timestamps: false, // Custom created_at
});

Room.hasMany(Booking, { foreignKey: 'room_id' });
Booking.belongsTo(Room, { foreignKey: 'room_id' });

// We export a function to sync and potentially seed data
export const initDB = async () => {
  await sequelize.sync({ alter: true }); // Use alter instead of force to keep data safely

  // Seed rooms if empty
  const count = await Room.count();
  if (count === 0) {
    await Room.bulkCreate([
      { name: 'Atlas', capacity: 4, floor: 1, amenities: 'monitor' },
      { name: 'Borealis', capacity: 8, floor: 1, amenities: 'projector, whiteboard' },
      { name: 'Cascade', capacity: 12, floor: 2, amenities: 'projector, video-conferencing' },
      { name: 'Delta', capacity: 20, floor: 3, amenities: 'projector, video-conferencing, whiteboard' },
      { name: 'Ember', capacity: 2, floor: 2, amenities: '' },
    ]);
  }
};

export { sequelize };
