import { Router } from 'express';
import { Room, Booking } from '../db';
import { validateBookingRules } from '../utils/rules';
import { Op } from 'sequelize';

const router = Router();

router.get('/', async (req, res) => {
  const { date, start, end, minCapacity } = req.query;
  
  if (!date || !start || !end || !minCapacity || typeof date !== 'string' || typeof start !== 'string' || typeof end !== 'string') {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Missing required parameters' } });
  }

  const capacity = parseInt(minCapacity as string, 10);
  if (isNaN(capacity) || capacity < 1) {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'minCapacity must be a positive integer' } });
  }

  const startIso = `${date}T${start}:00Z`;
  const endIso = `${date}T${end}:00Z`;

  // Pre-validate time rules for the requested window
  const tempValidation = validateBookingRules(
    { start: startIso, end: endIso, attendees: capacity },
    { id: 0, capacity: capacity }, // dummy room
    [],
    0
  );

  // We ignore CAPACITY_EXCEEDED and BOOKING_CONFLICT for this generic window check
  // But we want to enforce R1, R2, R3, R4, R5
  if (!tempValidation.valid && tempValidation.code !== 'CAPACITY_EXCEEDED' && tempValidation.code !== 'BOOKING_CONFLICT' && tempValidation.code !== 'TOO_MANY_BOOKINGS') {
    return res.status(400).json({ error: { code: tempValidation.code, message: tempValidation.message } });
  }

  try {
    // Find rooms with capacity >= minCapacity
    // And NOT exists overlapping confirmed bookings
    const rooms = await Room.findAll({
      where: {
        capacity: {
          [Op.gte]: capacity
        },
        id: {
          [Op.notIn]: Room.sequelize!.literal(`(
            SELECT room_id FROM bookings 
            WHERE status = 'confirmed' 
            AND start_time < '${endIso}' 
            AND end_time > '${startIso}'
          )`)
        }
      },
      order: [['capacity', 'ASC']]
    });
    
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

export { router };
