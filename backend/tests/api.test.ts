import request from 'supertest';
import { app } from '../src/app';
import { getClient, query } from '../src/db';
import { addDays, set, formatISO } from 'date-fns';

describe('API End-to-End Tests', () => {
  const baseDate = addDays(new Date(), 2); // Two days from now
  
  const createDateStr = (hours: number, minutes: number) => {
    return formatISO(set(baseDate, { hours, minutes, seconds: 0, milliseconds: 0 }));
  };

  afterAll(async () => {
    const { sequelize } = await import('../src/db');
    await sequelize.close();
  });

  let createdBookingId: number;

  test('Create a successful booking (201)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        roomId: 1, // Atlas
        title: 'Team Meeting',
        organizerEmail: 'test@example.com',
        attendees: 3,
        start: createDateStr(10, 0),
        end: createDateStr(11, 0)
      });
    
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    createdBookingId = res.body.id;
  });

  test('Create a conflicting booking (409)', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .send({
        roomId: 1, // Atlas
        title: 'Conflict Meeting',
        organizerEmail: 'test2@example.com',
        attendees: 3,
        start: createDateStr(10, 30),
        end: createDateStr(11, 30)
      });
    
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BOOKING_CONFLICT');
  });

  test('Delete booking (204)', async () => {
    const res = await request(app)
      .delete(`/api/bookings/${createdBookingId}`);
    
    expect(res.status).toBe(204);
  });
});
