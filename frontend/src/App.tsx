import { useState, useEffect } from 'react';
import { format, parseISO, startOfDay, addDays, getHours, getMinutes, isSameDay } from 'date-fns';
import { Calendar, Plus, Search, Trash2, X } from 'lucide-react';
import './index.css';

const API_BASE = 'http://localhost:3000/api';

interface Room {
  id: number;
  name: string;
  capacity: number;
  floor: number;
  amenities: string;
}

interface Booking {
  id: number;
  room_id: number;
  title: string;
  organizer_email: string;
  attendees: number;
  start_time: string;
  end_time: string;
  status: string;
}

function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // Form states
  const [formRoomId, setFormRoomId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formAttendees, setFormAttendees] = useState('1');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formError, setFormError] = useState('');

  // Search states
  const [searchCapacity, setSearchCapacity] = useState('1');
  const [searchStart, setSearchStart] = useState('');
  const [searchEnd, setSearchEnd] = useState('');
  const [searchResults, setSearchResults] = useState<Room[] | null>(null);
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    fetchBookings(currentDate);
  }, [currentDate]);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_BASE}/rooms`);
      if (res.ok) {
        setRooms(await res.json());
      }
    } catch (err) {
      setError('Failed to fetch rooms');
    }
  };

  const fetchBookings = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/bookings?date=${date}`);
      if (res.ok) {
        setBookings(await res.json());
        setError('');
      } else {
        setError('Failed to fetch bookings');
      }
    } catch (err) {
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      const startIso = `${currentDate}T${formStart}:00Z`;
      const endIso = `${currentDate}T${formEnd}:00Z`;
      
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: Number(formRoomId),
          title: formTitle,
          organizerEmail: formEmail,
          attendees: Number(formAttendees),
          start: startIso,
          end: endIso,
        })
      });
      
      if (res.ok) {
        setShowBookingModal(false);
        fetchBookings(currentDate);
        resetForm();
      } else {
        const data = await res.json();
        setFormError(data.error.message || 'Error creating booking');
      }
    } catch (err) {
      setFormError('Network error');
    }
  };

  const handleCancelBooking = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchBookings(currentDate);
      } else {
        const data = await res.json();
        alert(data.error.message || 'Failed to cancel');
      }
    } catch (err) {
      alert('Network error');
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    try {
      const res = await fetch(`${API_BASE}/availability?date=${currentDate}&start=${searchStart}&end=${searchEnd}&minCapacity=${searchCapacity}`);
      if (res.ok) {
        setSearchResults(await res.json());
      } else {
        const data = await res.json();
        setSearchError(data.error.message);
      }
    } catch (err) {
      setSearchError('Network error');
    }
  };

  const resetForm = () => {
    setFormRoomId('');
    setFormTitle('');
    setFormEmail('');
    setFormAttendees('1');
    setFormStart('');
    setFormEnd('');
  };

  const startBookingFromSearch = (roomId: number) => {
    setFormRoomId(roomId.toString());
    setFormStart(searchStart);
    setFormEnd(searchEnd);
    setShowSearchModal(false);
    setShowBookingModal(true);
  };

  const getPositionStyle = (start: string, end: string) => {
    const s = parseISO(start);
    const e = parseISO(end);
    
    const startMins = getHours(s) * 60 + getMinutes(s) - 8 * 60; // Offset from 8:00
    const endMins = getHours(e) * 60 + getMinutes(e) - 8 * 60;
    
    const totalDayMins = 12 * 60; // 8:00 to 20:00
    
    const left = (startMins / totalDayMins) * 100;
    const width = ((endMins - startMins) / totalDayMins) * 100;
    
    return { left: `${Math.max(0, left)}%`, width: `${Math.min(100 - left, width)}%` };
  };

  return (
    <div className="app-container">
      <header className="header">
        <div>
          <h1>Meeting Rooms</h1>
          <p style={{ color: 'var(--text-muted)' }}>Book your next collaboration space (All times UTC)</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="secondary" onClick={() => setShowSearchModal(true)}>
            <Search size={18} /> Find Room
          </button>
          <button onClick={() => setShowBookingModal(true)}>
            <Plus size={18} /> New Booking
          </button>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Calendar size={20} />
            <input 
              type="date" 
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              style={{ margin: 0, width: 'auto' }}
            />
          </div>
          {loading && <span style={{ color: 'var(--text-muted)' }}>Loading...</span>}
        </div>

        <div className="time-labels">
          <div></div>
          <div className="time-label-track">
            <span>08:00</span>
            <span>10:00</span>
            <span>12:00</span>
            <span>14:00</span>
            <span>16:00</span>
            <span>18:00</span>
            <span>20:00</span>
          </div>
        </div>

        <div className="schedule-grid">
          {rooms.map(room => (
            <div key={room.id} className="room-row">
              <div className="room-name">
                {room.name} <br/>
                <small style={{ color: 'var(--text-muted)' }}>Cap: {room.capacity}</small>
              </div>
              <div className="timeline">
                {bookings.filter(b => b.room_id === room.id).map(booking => {
                   const style = getPositionStyle(booking.start_time, booking.end_time);
                   return (
                     <div key={booking.id} className="booking-bar" style={style} title={`${booking.title} by ${booking.organizer_email}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.title}</span>
                          <button 
                            className="danger" 
                            style={{ padding: '2px', background: 'transparent' }} 
                            onClick={(e) => { e.stopPropagation(); handleCancelBooking(booking.id); }}
                            title="Cancel Booking"
                          >
                            <Trash2 size={12} color="white" />
                          </button>
                        </div>
                        <small>{format(parseISO(booking.start_time), 'HH:mm')} - {format(parseISO(booking.end_time), 'HH:mm')}</small>
                     </div>
                   );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showBookingModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>Book a Room</h2>
              <button className="secondary" style={{ padding: '0.25rem' }} onClick={() => setShowBookingModal(false)}>
                <X size={20} />
              </button>
            </div>
            {formError && <div className="alert alert-error">{formError}</div>}
            <form onSubmit={handleCreateBooking}>
              <label>Room</label>
              <select value={formRoomId} onChange={e => setFormRoomId(e.target.value)} required>
                <option value="">Select a room...</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} (Cap: {r.capacity})</option>)}
              </select>

              <label>Title</label>
              <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} required maxLength={100} />

              <label>Organizer Email</label>
              <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} required />

              <label>Attendees</label>
              <input type="number" min="1" value={formAttendees} onChange={e => setFormAttendees(e.target.value)} required />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Start Time (UTC HH:mm)</label>
                  <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} required step="900" />
                </div>
                <div>
                  <label>End Time (UTC HH:mm)</label>
                  <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} required step="900" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="submit">Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSearchModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2>Find Available Room</h2>
              <button className="secondary" style={{ padding: '0.25rem' }} onClick={() => setShowSearchModal(false)}>
                <X size={20} />
              </button>
            </div>
            {searchError && <div className="alert alert-error">{searchError}</div>}
            
            <form onSubmit={handleSearch} style={{ marginBottom: '1.5rem' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Start Time (UTC)</label>
                  <input type="time" value={searchStart} onChange={e => setSearchStart(e.target.value)} required step="900" />
                </div>
                <div>
                  <label>End Time (UTC)</label>
                  <input type="time" value={searchEnd} onChange={e => setSearchEnd(e.target.value)} required step="900" />
                </div>
              </div>
              <label>Minimum Capacity</label>
              <input type="number" min="1" value={searchCapacity} onChange={e => setSearchCapacity(e.target.value)} required />
              
              <button type="submit" style={{ width: '100%' }}>Search</button>
            </form>

            {searchResults && (
              <div>
                <h3>Available Rooms</h3>
                {searchResults.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No rooms available for this time.</p>
                ) : (
                  <div className="grid">
                    {searchResults.map(r => (
                      <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                        <div>
                          <strong>{r.name}</strong>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Cap: {r.capacity} | Floor {r.floor}</div>
                        </div>
                        <button onClick={() => startBookingFromSearch(r.id)}>Book</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
