import express from 'express';
import cors from 'cors';
import { router as roomsRouter } from './routes/rooms';
import { router as bookingsRouter } from './routes/bookings';
import { router as availabilityRouter } from './routes/availability';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/rooms', roomsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/availability', availabilityRouter);

export { app };
