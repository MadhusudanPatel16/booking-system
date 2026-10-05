import { Router } from 'express';
import { Room } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const rooms = await Room.findAll({ order: [['name', 'ASC']], raw: true });
    res.json(rooms);
  } catch (err: any) {
    console.error('Error in GET /rooms:', err);
    res.status(500).json({ error: 'Server error', details: err?.message || String(err) });
  }
});

export { router };
