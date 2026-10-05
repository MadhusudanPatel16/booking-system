import { parseISO, isBefore, isEqual, differenceInMinutes, getMinutes, startOfDay, endOfDay, isValid } from 'date-fns';

export interface BookingInput {
  start: string;
  end: string;
  attendees: number;
}

export interface Room {
  id: number;
  capacity: number;
}

export interface ExistingBooking {
  id: number;
  start: string;
  end: string;
}

export function validateBookingRules(
  input: BookingInput,
  room: Room,
  existingBookings: ExistingBooking[],
  userDayBookingCount: number
): { valid: boolean; code?: string; message?: string } {
  const start = parseISO(input.start);
  const end = parseISO(input.end);
  const now = new Date();

  // Validate format
  if (!isValid(start) || !isValid(end)) {
    return { valid: false, code: 'INVALID_DATE', message: 'Invalid start or end date format.' };
  }

  // R1: end must be after start
  if (isBefore(end, start) || isEqual(end, start)) {
    return { valid: false, code: 'END_BEFORE_START', message: 'End time must be after start time.' };
  }

  // R2: start and end must fall on 15-minute boundaries
  if (getMinutes(start) % 15 !== 0 || getMinutes(end) % 15 !== 0 || start.getSeconds() !== 0 || end.getSeconds() !== 0) {
    return { valid: false, code: 'INVALID_BOUNDARY', message: 'Times must be on 15-minute boundaries with zero seconds.' };
  }

  // R3: A booking must last at least 15 minutes and at most 4 hours.
  const diffMinutes = differenceInMinutes(end, start);
  if (diffMinutes < 15 || diffMinutes > 240) {
    return { valid: false, code: 'INVALID_DURATION', message: 'Booking must last between 15 minutes and 4 hours.' };
  }

  // R4: A booking must fall entirely within business hours, 08:00 to 20:00 UTC, and start and end on the same UTC day.
  const startH = start.getUTCHours();
  const startM = start.getUTCMinutes();
  const endH = end.getUTCHours();
  const endM = end.getUTCMinutes();

  const isStartValid = startH >= 8 && (startH < 20 || (startH === 20 && startM === 0));
  const isEndValid = endH >= 8 && (endH < 20 || (endH === 20 && endM === 0));

  if (!isStartValid || !isEndValid) {
    return { valid: false, code: 'OUT_OF_HOURS', message: 'Booking must be between 08:00 and 20:00 UTC.' };
  }

  if (start.getUTCFullYear() !== end.getUTCFullYear() || start.getUTCMonth() !== end.getUTCMonth() || start.getUTCDate() !== end.getUTCDate()) {
    return { valid: false, code: 'MULTIPLE_DAYS', message: 'Booking must start and end on the same UTC day.' };
  }

  // R5: A booking cannot start in the past.
  if (isBefore(start, now)) {
    return { valid: false, code: 'PAST_START', message: 'Booking cannot start in the past.' };
  }

  // R6: attendees cannot exceed the room capacity.
  if (input.attendees > room.capacity) {
    return { valid: false, code: 'CAPACITY_EXCEEDED', message: `Attendees exceed room capacity of ${room.capacity}.` };
  }

  // R9: An organizer cannot hold more than 3 confirmed bookings that start on the same day.
  if (userDayBookingCount >= 3) {
    return { valid: false, code: 'TOO_MANY_BOOKINGS', message: 'Organizer cannot hold more than 3 bookings per day.' };
  }

  // R7: A room cannot have two confirmed bookings that overlap in time.
  for (const b of existingBookings) {
    const existingStart = parseISO(b.start);
    const existingEnd = parseISO(b.end);

    // Overlap condition: start < existingEnd AND end > existingStart
    if (isBefore(start, existingEnd) && isBefore(existingStart, end)) {
      return { valid: false, code: 'BOOKING_CONFLICT', message: 'Room is already booked for this time.' };
    }
  }

  return { valid: true };
}
