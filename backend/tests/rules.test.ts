import { validateBookingRules } from '../src/utils/rules';
import { addDays, set, formatISO } from 'date-fns';

describe('Booking Rules', () => {
  const room = { id: 1, capacity: 10 };
  const baseDate = addDays(new Date(), 1); // Tomorrow to avoid PAST_START
  
  const createDateStr = (hours: number, minutes: number) => {
    return formatISO(set(baseDate, { hours, minutes, seconds: 0, milliseconds: 0 }));
  };

  test('Valid booking', () => {
    const result = validateBookingRules(
      { start: createDateStr(10, 0), end: createDateStr(11, 0), attendees: 5 },
      room,
      [],
      0
    );
    expect(result.valid).toBe(true);
  });

  test('R1: end must be after start', () => {
    const result = validateBookingRules(
      { start: createDateStr(11, 0), end: createDateStr(10, 0), attendees: 5 },
      room,
      [],
      0
    );
    expect(result.code).toBe('END_BEFORE_START');
  });

  test('R2: start and end must fall on 15-minute boundaries', () => {
    const result = validateBookingRules(
      { start: createDateStr(10, 5), end: createDateStr(11, 0), attendees: 5 },
      room,
      [],
      0
    );
    expect(result.code).toBe('INVALID_BOUNDARY');
  });

  test('R3: A booking must last at least 15 minutes and at most 4 hours', () => {
    const resultShort = validateBookingRules(
      { start: createDateStr(10, 0), end: createDateStr(10, 0), attendees: 5 },
      room,
      [],
      0
    );
    expect(resultShort.code).toBe('END_BEFORE_START'); // Hits R1 first usually, let's try 10 mins
    
    const resultShort2 = validateBookingRules(
      // Wait, 10 mins isn't a 15-minute boundary, so R2 hits.
      // Let's assume R1 and R2 pass, minimum difference is 15 mins.
      // Actually to test R3 being > 4 hours
      { start: createDateStr(10, 0), end: createDateStr(15, 0), attendees: 5 },
      room,
      [],
      0
    );
    expect(resultShort2.code).toBe('INVALID_DURATION');
  });

  test('R4: A booking must fall entirely within business hours (08:00 to 20:00 UTC)', () => {
    const resultEarly = validateBookingRules(
      { start: createDateStr(7, 0), end: createDateStr(8, 0), attendees: 5 },
      room,
      [],
      0
    );
    expect(resultEarly.code).toBe('OUT_OF_HOURS');

    const resultLate = validateBookingRules(
      { start: createDateStr(19, 0), end: createDateStr(21, 0), attendees: 5 },
      room,
      [],
      0
    );
    expect(resultLate.code).toBe('OUT_OF_HOURS');
  });

  test('R6: attendees cannot exceed the room capacity', () => {
    const result = validateBookingRules(
      { start: createDateStr(10, 0), end: createDateStr(11, 0), attendees: 15 },
      room,
      [],
      0
    );
    expect(result.code).toBe('CAPACITY_EXCEEDED');
  });

  test('R9: An organizer cannot hold more than 3 confirmed bookings that start on the same day', () => {
    const result = validateBookingRules(
      { start: createDateStr(10, 0), end: createDateStr(11, 0), attendees: 5 },
      room,
      [],
      3 // already has 3
    );
    expect(result.code).toBe('TOO_MANY_BOOKINGS');
  });

  describe('R7: Overlap reference cases', () => {
    const existing = [
      { id: 1, start: createDateStr(10, 0), end: createDateStr(11, 0) }
    ];

    test('09:00 to 10:00 Allowed', () => {
      expect(validateBookingRules(
        { start: createDateStr(9, 0), end: createDateStr(10, 0), attendees: 5 },
        room, existing, 0
      ).valid).toBe(true);
    });

    test('11:00 to 12:00 Allowed', () => {
      expect(validateBookingRules(
        { start: createDateStr(11, 0), end: createDateStr(12, 0), attendees: 5 },
        room, existing, 0
      ).valid).toBe(true);
    });

    test('09:30 to 10:30 Rejected', () => {
      expect(validateBookingRules(
        { start: createDateStr(9, 30), end: createDateStr(10, 30), attendees: 5 },
        room, existing, 0
      ).code).toBe('BOOKING_CONFLICT');
    });

    test('10:30 to 11:30 Rejected', () => {
      expect(validateBookingRules(
        { start: createDateStr(10, 30), end: createDateStr(11, 30), attendees: 5 },
        room, existing, 0
      ).code).toBe('BOOKING_CONFLICT');
    });

    test('10:15 to 10:45 Rejected', () => {
      expect(validateBookingRules(
        { start: createDateStr(10, 15), end: createDateStr(10, 45), attendees: 5 },
        room, existing, 0
      ).code).toBe('BOOKING_CONFLICT');
    });

    test('09:00 to 12:00 Rejected', () => {
      expect(validateBookingRules(
        { start: createDateStr(9, 0), end: createDateStr(12, 0), attendees: 5 },
        room, existing, 0
      ).code).toBe('BOOKING_CONFLICT');
    });

    test('10:00 to 11:00 Rejected', () => {
      expect(validateBookingRules(
        { start: createDateStr(10, 0), end: createDateStr(11, 0), attendees: 5 },
        room, existing, 0
      ).code).toBe('BOOKING_CONFLICT');
    });
  });
});
