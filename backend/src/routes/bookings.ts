import { Router } from 'express';
import { Room, Booking, sequelize } from '../db';
import { validateBookingRules } from '../utils/rules';
import { parseISO, startOfDay, endOfDay } from 'date-fns';
import { Op } from 'sequelize';

const router = Router();

router.get('/', async (req, res) => {
  const { date, roomId } = req.query;
  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Date is required in YYYY-MM-DD format.' } });
  }
  
  try {
    const dayStart = startOfDay(parseISO(date));
    const dayEnd = endOfDay(parseISO(date));
    
    const whereClause: any = {
      start_time: {
        [Op.gte]: dayStart,
        [Op.lte]: dayEnd
      },
      status: 'confirmed'
    };

    if (roomId) {
      whereClause.room_id = roomId;
    }
    
    const bookings = await Booking.findAll({ where: whereClause, raw: true });
    res.json(bookings);
  } catch (err: any) {
    console.error('Error in GET /bookings:', err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err?.message || String(err) } });
  }
});

router.post('/', async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { roomId, title, organizerEmail, attendees, start, end } = req.body;
    
    if (!roomId || !title || !organizerEmail || !attendees || !start || !end) {
      await transaction.rollback();
      return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'Missing required fields' } });
    }

    // Lock the room to prevent concurrent bookings for the same room
    const room = await Room.findByPk(roomId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!room) {
      await transaction.rollback();
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Room not found' } });
    }

    // Fetch existing confirmed bookings for the room
    const bookingsRes = await Booking.findAll({
      where: {
        room_id: roomId,
        status: 'confirmed'
      },
      transaction
    });
    
    const existingBookings = bookingsRes.map(b => ({
      id: b.id,
      start: b.start_time.toISOString(),
      end: b.end_time.toISOString()
    }));

    // Fetch user bookings for the day
    const dayStart = startOfDay(parseISO(start));
    const dayEnd = endOfDay(parseISO(start));
    
    const userDayBookingCount = await Booking.count({
      where: {
        organizer_email: organizerEmail,
        start_time: {
          [Op.gte]: dayStart,
          [Op.lte]: dayEnd
        },
        status: 'confirmed'
      },
      transaction
    });

    // Validate pure rules
    const validation = validateBookingRules(
      { start, end, attendees },
      { id: room.id, capacity: room.capacity },
      existingBookings,
      userDayBookingCount
    );

    if (!validation.valid) {
      await transaction.rollback();
      const status = validation.code === 'BOOKING_CONFLICT' || validation.code === 'TOO_MANY_BOOKINGS' ? 409 : 400;
      return res.status(status).json({
        error: {
          code: validation.code,
          message: validation.message,
        }
      });
    }

    const newBooking = await Booking.create({
      room_id: roomId,
      title: title.trim(),
      organizer_email: organizerEmail,
      attendees,
      start_time: parseISO(start),
      end_time: parseISO(end),
      status: 'confirmed'
    }, { transaction });

    await transaction.commit();
    res.status(201).json(newBooking);

  } catch (err) {
    if (!(transaction as any).finished) {
      await transaction.rollback();
    }
    console.error(err);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const transaction = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    
    if (!booking) {
      await transaction.rollback();
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Booking not found' } });
    }
    
    if (booking.status === 'cancelled') {
      await transaction.rollback();
      return res.status(204).send(); // Already cancelled is no-op
    }

    if (booking.start_time <= new Date()) {
      await transaction.rollback();
      return res.status(409).json({ error: { code: 'ALREADY_STARTED', message: 'Cannot cancel a booking that has started' } });
    }

    booking.status = 'cancelled';
    await booking.save({ transaction });
    
    await transaction.commit();
    res.status(204).send();
  } catch (err) {
    if (!(transaction as any).finished) {
      await transaction.rollback();
    }
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Server error' } });
  }
});

export { router };
