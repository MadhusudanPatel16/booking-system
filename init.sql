CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL,
  floor INT NOT NULL,
  amenities TEXT
);

INSERT INTO rooms (name, capacity, floor, amenities) VALUES
('Atlas', 4, 1, 'monitor'),
('Borealis', 8, 1, 'projector, whiteboard'),
('Cascade', 12, 2, 'projector, video-conferencing'),
('Delta', 20, 3, 'projector, video-conferencing, whiteboard'),
('Ember', 2, 2, '');

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  room_id INT REFERENCES rooms(id),
  title VARCHAR(100) NOT NULL,
  organizer_email VARCHAR(255) NOT NULL,
  attendees INT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
