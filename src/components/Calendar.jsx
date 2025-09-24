import React, { useEffect, useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/init";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import "../styles/App.css";
import { AppContext } from "../appContext";

export default function CalendarBooking() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedHour, setSelectedHour] = useState("");
  const [selectedMinute, setSelectedMinute] = useState("");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [userBookings, setUserBookings] = useState(new Set());

  const { name, niche, money } = useContext(AppContext);
  
  // Obtener email y phone desde localStorage
  const email = localStorage.getItem('userEmail');
  const phone = localStorage.getItem('userPhone');
  const navigate = useNavigate();
  
  // Detectar zona horaria del usuario
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const italyTimezone = 'Europe/Rome';
  
  // Función auxiliar para obtener la fecha actual en Italia
  const getTodayInItaly = () => {
    const todayInItaly = new Date().toLocaleDateString("en-CA", {timeZone: italyTimezone});
    const [todayYear, todayMonth, todayDay] = todayInItaly.split('-').map(Number);
    return new Date(todayYear, todayMonth - 1, todayDay, 0, 0, 0, 0);
  };
  
  // Función auxiliar para obtener la hora actual en Italia
  const getNowInItaly = () => {
    const nowInItaly = new Date().toLocaleString("en-US", {timeZone: italyTimezone});
    return new Date(nowInItaly);
  };
  
  // Función para obtener horarios disponibles según el día de la semana
  const getTimeSlotsByDay = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    
    switch (dayOfWeek) {
      case 5: // Viernes: 10-13 y 18-19
        return [
          "10:00", "10:20", "10:40",
          "11:00", "11:20", "11:40",
          "12:00", "12:20", "12:40",
          "18:00", "18:20", "18:40"
        ];
      case 0: // Domingo: 10-13
        return [
          "10:00", "10:20", "10:40",
          "11:00", "11:20", "11:40",
          "12:00", "12:20", "12:40"
        ];
      case 3: // Miércoles: 18-19
        return [
            "18:00", "18:20", "18:40"
        ];
      default:
        return []; // No hay horarios disponibles en otros días
    }
  };

  // Horarios disponibles (9 AM a 6 PM) - Cada hora dividida en 3 partes de 20 minutos
  const timeSlots = [
    "09:00", "09:20", "09:40",
    "10:00", "10:20", "10:40",
    "11:00", "11:20", "11:40",
    "12:00", "12:20", "12:40",
    "13:00", "13:20", "13:40",
    "14:00", "14:20", "14:40",
    "15:00", "15:20", "15:40",
    "16:00", "16:20", "16:40",
    "17:00", "17:20", "17:40",
    "18:00", "18:20", "18:40"
  ];

  // Obtener horas únicas disponibles
  const getAvailableHours = (dateString) => {
    const availableTimeSlots = getTimeSlotsByDay(dateString);
    const hours = [...new Set(availableTimeSlots.map(slot => slot.split(':')[0]))];
    return hours.filter(hour => {
      // Verificar si al menos un slot de 20 minutos está disponible para esta hora
      return ["00", "20", "40"].some(minute => 
        isTimeSlotAvailable(dateString, `${hour}:${minute}`)
      );
    });
  };

  // Obtener minutos disponibles para una hora específica
  const getAvailableMinutes = (dateString, hour) => {
    const availableTimeSlots = getTimeSlotsByDay(dateString);
    const availableMinutesForHour = availableTimeSlots
      .filter(slot => slot.startsWith(`${hour}:`))
      .map(slot => slot.split(':')[1]);
    
    return availableMinutesForHour.filter(minute => 
      isTimeSlotAvailable(dateString, `${hour}:${minute}`)
    );
  };

  // Función para convertir horario de Italia al horario del usuario
  const convertItalyTimeToUserTime = (dateString, time, userTimezone) => {
    // Separar fecha y hora
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
  
    // Crear una fecha base en UTC para el día especificado
    const baseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // mediodía UTC
    
    // Obtener qué hora sería en Italia en ese momento para saber el offset
    const italyNoon = new Date(baseDate.toLocaleString("en-US", {timeZone: "Europe/Rome"}));
    const utcNoon = new Date(baseDate.toLocaleString("en-US", {timeZone: "UTC"}));
    
    // Calcular el offset de Italia respecto a UTC en milisegundos
    const italyOffsetMs = utcNoon.getTime() - italyNoon.getTime();
    
    // Crear la fecha que representa la hora especificada en Italia
    // Cuando en Italia son las 18:00, necesitamos saber qué hora UTC es
    const italyDateTime = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    const utcEquivalent = new Date(italyDateTime.getTime() + italyOffsetMs);
    
    // Convertir a hora del usuario
    const userTimeString = utcEquivalent.toLocaleString('en-CA', {
      timeZone: userTimezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  
    return userTimeString;
  };
  
  // Función para obtener el nombre de la zona horaria del usuario
  const getUserTimezoneDisplay = () => {
    try {
      const timezoneName = new Intl.DateTimeFormat('it-IT', {
        timeZone: userTimezone,
        timeZoneName: 'long'
      }).formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value;
      
      // Si no se puede obtener el nombre completo, usar el identificador
      return timezoneName || userTimezone.split('/').pop().replace(/_/g, ' ');
    } catch (error) {
      return userTimezone.split('/').pop().replace(/_/g, ' ');
    }
  };

  const verifyAccepted = async () => {
    try {
      // Verificar si hay datos en localStorage
      if (!email || !phone) {
        console.log('No hay datos en localStorage, redirigiendo a /')
        navigate('/wesleycaicedo')
        return
      }

      // Buscar en Firebase si existe un registro que contenga ambos datos (email y phone en el mismo documento)
      console.log('Verificando registro en Firebase...')
      const registrosRef = collection(db, 'registros')

      // Query que busca un documento donde ambos campos coincidan
      const bothQuery = query(
        registrosRef,
        where('email', '==', email),
        where('phone', '==', phone)
      )

      const bothSnapshot = await getDocs(bothQuery)

      // Si no existe ningún registro con ambos datos, redirigir a /
      if (bothSnapshot.empty) {
        console.log('No se encontró registro en Firebase con ambos datos, redirigiendo a /')
        navigate('/wesleycaicedo')
        return
      }

      console.log('Registro encontrado en Firebase con ambos datos, continuando...')

    } catch (error) {
      console.error('Error verificando registro:', error)
      navigate('/wesleycaicedo')
    }
  }

  // 1. Traer eventos de Google Calendar y reservas existentes
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // Intentar obtener eventos de Google Calendar
        try {
          console.log('userEmail', email)
          console.log('userPhone', phone)
          await verifyAccepted()

          const res = await axios.get("/api/google-calendar-events");
          const formattedEvents = res.data.map(event => ({
            title: event.summary,
            start: new Date(event.start.dateTime || event.start.date),
            end: new Date(event.end.dateTime || event.end.date),
          }));
          setEvents(formattedEvents);
        } catch (googleError) {
          console.log("Google Calendar API no disponible, usando solo reservas locales");
        }

        // Obtener reservas de Firestore
        const bookingsQuery = query(collection(db, "bookings"));
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookings = bookingsSnapshot.docs.map(doc => ({
          title: "Reservado",
          start: new Date(doc.data().start),
          end: new Date(doc.data().end),
        }));

        // Obtener reservas específicas del usuario actual
        const userBookingTimes = new Set();
        
        if (email && phone) {
          console.log('Buscando reservas para:', { email, phone });
          bookingsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log('Documento encontrado:', data);
            if (data.email === email || data.phone === phone) {
              console.log('Reserva propia encontrada:', data.start);
              userBookingTimes.add(data.start);
            }
          });
        }
        
        console.log('Total de reservas propias:', userBookingTimes.size);
        console.log('Reservas propias:', Array.from(userBookingTimes));
        setUserBookings(userBookingTimes);
        setEvents(prev => [...prev, ...bookings]);
      } catch (error) {
        console.error("Error fetching events", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [navigate]);

  // 2. Verificar si un horario está disponible - CORREGIDA para slots de 20 minutos
  const isTimeSlotAvailable = (dateString, time) => {
    // Crear fecha y hora específicas usando Date constructor con componentes separados
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    
    const slotStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
    const slotEnd = new Date(year, month - 1, day, hours, minutes + 20, 0, 0); // 20 minutos de duración
    
    // Obtener la hora actual en la zona horaria de Italia
    const now = getNowInItaly();
    
    // Obtener la fecha de hoy en Italia
    const todayDate = getTodayInItaly();
    const selectedDay = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Verificar si la hora ya pasó (solo para hoy en Italia)
    if (selectedDay.getTime() === todayDate.getTime()) {
      // Si es hoy en Italia, verificar si la hora ya pasó
      // Agregar 30 minutos de buffer para evitar reservas muy próximas
      const bufferTime = 30 * 60 * 1000; // 30 minutos en millisegundos
      const slotStartWithBuffer = new Date(slotStart.getTime() - bufferTime);
      
      if (slotStartWithBuffer <= now) {
        console.log(`Time slot ${time} on ${dateString} is in the past or too close to current time`);
        return false;
      }
    }

    // Verificar conflictos con eventos existentes
    return !events.some(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      return (
        (slotStart >= eventStart && slotStart < eventEnd) ||
        (slotEnd > eventStart && slotEnd <= eventEnd) ||
        (slotStart <= eventStart && slotEnd >= eventEnd)
      );
    });
  };

  // Nueva función para verificar si el usuario tiene su propia cita en este horario
  const isUserOwnBooking = (dateString, time) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    
    // Crear fecha en UTC como se hace al guardar la reserva
    const slotStart = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    const slotStartISO = slotStart.toISOString();
    const hasBooking = userBookings.has(slotStartISO);
    
    if (hasBooking) {
      console.log('Reserva propia encontrada para:', dateString, time, slotStartISO);
    }
    
    return hasBooking;
  };

  // Nueva función para verificar si un time slot está ocupado por otro usuario
  const isOccupiedByOthers = (dateString, time) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    
    // Crear fecha en UTC como se hace al guardar la reserva
    const slotStart = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    const slotEnd = new Date(slotStart.getTime() + 20 * 60 * 1000); // +20 minutos
    
    // Verificar si hay algún evento que ocupe este slot, pero que NO sea del usuario actual
    const isOccupied = events.some(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);

      // Verificar solapamiento de horarios
      const hasOverlap = (
        (slotStart >= eventStart && slotStart < eventEnd) ||
        (slotEnd > eventStart && slotEnd <= eventEnd) ||
        (slotStart <= eventStart && slotEnd >= eventEnd)
      );

      // Si hay solapamiento, verificar si NO es una reserva propia
      if (hasOverlap) {
        const isOwnBooking = userBookings.has(eventStart.toISOString());
        return !isOwnBooking; // Solo contar como ocupado si NO es reserva propia
      }
      
      return false;
    });
    
    if (isOccupied) {
      console.log('Time slot ocupado por otro usuario:', dateString, time);
    }
    
    return isOccupied;
  };

  // 3. Manejar selección de hora
  const handleHourSelect = (hour) => {
    if (!selectedDate) {
      alert("Per favore seleziona prima una data");
      return;
    }
    
    setSelectedHour(hour);
    setSelectedMinute(""); // Reset minute selection
  };

  // 4. Manejar selección de minuto
  const handleMinuteSelect = (minute) => {
    if (!selectedDate || !selectedHour) {
      alert("Per favore seleziona prima una data e ora");
      return;
    }
    
    const fullTime = `${selectedHour}:${minute}`;
    if (isTimeSlotAvailable(selectedDate, fullTime)) {
      setSelectedMinute(minute);
      setSelectedTime(fullTime);
      setBookingError(""); // Limpiar errores previos
      setShowBookingModal(true);
    }
  };

  // 4. Manejar reserva
  const handleBooking = async (e) => {
    e.preventDefault();
    setIsBooking(true);
  
    try {
      // Verificar si ya existe una reserva con el mismo email o teléfono
      const registerRef = collection(db, "registros");
      const registerQuery = query(
        registerRef,
        where('email', '==', email),
        where('phone', '==', phone)
      );
      const registerSnapshot = await getDocs(registerQuery);
  
      let registerEmail, registerPhone, registerName, registerNiche, registerMoney;
      if (!registerSnapshot.empty) {
        const registerData = registerSnapshot.docs[0].data();
        registerEmail = registerData.email;
        registerPhone = registerData.phone;
        registerName = registerData.name;
        registerNiche = registerData.niche;
        registerMoney = registerData.money;
      }
  
      const bookingsRef = collection(db, "bookings");
      
      // Query para buscar reservas existentes
      const emailQuery = query(bookingsRef, where('email', '==', registerEmail));
      const emailSnapshot = await getDocs(emailQuery);
  
      const phoneQuery = query(bookingsRef, where('phone', '==', registerPhone));
      const phoneSnapshot = await getDocs(phoneQuery);
  
      if (!emailSnapshot.empty || !phoneSnapshot.empty || !registerEmail || !registerPhone) {
        let errorMessage = "Esiste già una prenotazione con ";
        
        if (!emailSnapshot.empty && !phoneSnapshot.empty && !registerEmail && !registerPhone) {
          errorMessage += "questa email e telefono.";
        } else if (!emailSnapshot.empty) {
          errorMessage += "questa email.";
        } else {
          errorMessage += "questo telefono.";
        }
        
        errorMessage += " Ti preghiamo di contattarci se hai bisogno di modificare la tua prenotazione esistente.";
        setBookingError(errorMessage);
        return;
      }
  
      // Obtener hora local del usuario usando la función convertItalyTimeToUserTime
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userTime = convertItalyTimeToUserTime(selectedDate, selectedTime, userTimezone);
  
      // Crear objeto Date en Italia para guardar en ISO
      const [year, month, day] = selectedDate.split('-').map(Number);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const italyDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
      const italyEndDate = new Date(italyDate.getTime() + 20 * 60 * 1000); // +20 minutos
  
      await addDoc(collection(db, "bookings"), {
        email: registerEmail,
        name: registerName,
        phone: registerPhone,
        niche: registerNiche,
        money: registerMoney,
        start: italyDate.toISOString(),
        end: italyEndDate.toISOString(),
        userTime, // hora local del usuario
        createdAt: new Date().toISOString()
      });
  
      // Actualizar eventos localmente
      setEvents([...events, { 
        title: "Reservado", 
        start: italyDate, 
        end: italyEndDate 
      }]);
  
      // Actualizar reservas del usuario
      setUserBookings(prev => new Set([...prev, italyDate.toISOString()]));
  
      setBookingSuccess(true);
      setBookingError("");
  
    } catch (err) {
      console.error("Error al reservar", err);
      setBookingError("Errore durante l'elaborazione della prenotazione. Riprova di nuovo.");
    } finally {
      setIsBooking(false);
    }
  };
  

  // 5. Generar días del calendario - COMPLETAMENTE CORREGIDA
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Primer día del mes
    const firstDayOfMonth = new Date(year, month, 1);
    // Último día del mes
    const lastDayOfMonth = new Date(year, month + 1, 0);
    // Día de la semana del primer día (0 = domingo)
    const firstDayWeekday = firstDayOfMonth.getDay();
    
    const days = [];
    
    // Obtener la fecha de hoy en la zona horaria de Italia
    const today = getTodayInItaly();

    // Días del mes anterior para completar la primera semana
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      const dateString = formatDateString(date);
      
      days.push({
        date: new Date(date),
        dateString,
        day: date.getDate(),
        isCurrentMonth: false,
        isPast: date < today,
        availableSlots: 0,
        totalSlots: timeSlots.length
      });
    }

    // Días del mes actual
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateString = formatDateString(date);
      const isPast = date < today;
      
      // Calcular disponibilidad solo para días futuros del mes actual
      let availableSlots = 0;
      let ownBookingsCount = 0;
      if (!isPast) {
        const dayTimeSlots = getTimeSlotsByDay(dateString);
        availableSlots = dayTimeSlots.filter(time => 
          isTimeSlotAvailable(dateString, time)
        ).length;
        
        // Contar reservas propias del usuario en este día
        ownBookingsCount = dayTimeSlots.filter(time => 
          isUserOwnBooking(dateString, time)
        ).length;
        
        if (ownBookingsCount > 0) {
          console.log(`Día ${dateString} tiene ${ownBookingsCount} reservas propias`);
        }
      }

      // Verificar si este día tiene horarios disponibles
      const dayTimeSlots = getTimeSlotsByDay(dateString);
      const hasAvailableHours = dayTimeSlots.length > 0;

      days.push({
        date: new Date(date),
        dateString,
        day: date.getDate(),
        isCurrentMonth: true,
        isPast,
        availableSlots,
        ownBookingsCount,
        totalSlots: dayTimeSlots.length,
        hasAvailableHours // Nueva propiedad para indicar si el día tiene horarios
      });
    }

    // Días del mes siguiente para completar la última semana
    const totalDaysShown = days.length;
    const remainingDays = 42 - totalDaysShown; // 6 semanas × 7 días
    
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      const dateString = formatDateString(date);
      
      days.push({
        date: new Date(date),
        dateString,
        day: date.getDate(),
        isCurrentMonth: false,
        isPast: date < today,
        availableSlots: 0,
        totalSlots: timeSlots.length
      });
    }

    return days;
  };

  // Función auxiliar para formatear fecha como string YYYY-MM-DD
  const formatDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 6. Cambiar mes - MEJORADA
  const changeMonth = (direction) => {
    // Obtener la fecha de hoy en la zona horaria de Italia
    const today = getTodayInItaly();
    
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1);
    
    // No permitir navegar a meses anteriores al actual (en Italia)
    if (direction < 0 && newMonth < new Date(today.getFullYear(), today.getMonth(), 1)) {
      return;
    }
    
    setCurrentMonth(newMonth);
  };

  // 7. Seleccionar día - MEJORADA
  const handleDaySelect = (day) => {
    if (day.isPast || !day.isCurrentMonth || !day.hasAvailableHours) return;
    
    setSelectedDate(day.dateString);
    setSelectedHour(""); // Reset hour selection
    setSelectedMinute(""); // Reset minute selection
    setSelectedTime(""); // Reset time selection
    setShowDayDetail(true);
  };

  // 8. Obtener nombre del mes en italiano
  const getMonthName = (date) => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  // 9. Verificar si se puede navegar al mes anterior
  const canNavigateToPreviousMonth = () => {
    // Obtener la fecha de hoy en la zona horaria de Italia
    const today = getTodayInItaly();
    
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return previousMonth >= currentMonthStart;
  };

  if (loading) {
    return (
      <div className="calendar-container">
        <div className="calendar-content">
          <div className="calendar-header">
            <div className="calendar-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="loading-spinner-large">
              <div className="spinner"></div>
            </div>
            <p className="loading-text">Cargando calendario...</p>
          </div>
        </div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays();

  return (
    <div className="calendar-container">
      <div className="calendar-content-full">
        {/* Header */}
        <div className="calendar-header">
          <div className="calendar-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <h1 className="calendar-title">Prenota una Chiamata</h1>
          <p className="calendar-message">Seleziona una data per vedere gli orari disponibili</p>
        </div>

        {/* Calendar Navigation */}
        <div className="calendar-nav">
          <button 
            className="nav-btn" 
            onClick={() => changeMonth(-1)}
            disabled={!canNavigateToPreviousMonth()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15,18 9,12 15,6"/>
            </svg>
          </button>
          
          <h2 className="calendar-month-title">{getMonthName(currentMonth)}</h2>
          
          <button className="nav-btn" onClick={() => changeMonth(1)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          {/* Days of week header */}
          <div className="calendar-weekdays">
            {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map(day => (
              <div key={day} className="weekday-header">{day}</div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="calendar-days">
            {calendarDays.map((day, index) => (
              <button
                key={index}
                onClick={() => handleDaySelect(day)}
                className={`calendar-day ${
                  !day.isCurrentMonth ? 'other-month' : ''
                } ${
                  day.isPast ? 'past-day' : ''
                } ${
                  day.dateString === selectedDate ? 'selected-day' : ''
                } ${
                  day.availableSlots === 0 && day.isCurrentMonth && !day.isPast && day.ownBookingsCount === 0 ? 'fully-booked' : ''
                } ${
                  day.ownBookingsCount > 0 && day.isCurrentMonth && !day.isPast ? 'has-own-booking' : ''
                } ${
                  !day.hasAvailableHours && day.isCurrentMonth && !day.isPast ? 'no-availability' : ''
                }`}
                disabled={day.isPast || !day.isCurrentMonth || !day.hasAvailableHours || day.availableSlots === 0}
              >
                <span className="day-number">{day.day}</span>
                {day.isCurrentMonth && !day.isPast && day.ownBookingsCount > 0  && (
                  <div className="availability-indicator">
                    <div className="own-booking-text">
                      Prenotato
                    </div>
                  </div>
                )}



              </button>
            ))}
          </div>
        </div>

        {/* Day Detail Modal */}
        {showDayDetail && selectedDate && (
          <div className="modal-overlay" onClick={() => setShowDayDetail(false)}>
            <div className="modal-content day-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {(() => {
                    const [year, month, day] = selectedDate.split('-').map(Number);
                    const date = new Date(year, month - 1, day);
                    return date.toLocaleDateString('it-IT', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });
                  })()}
                </h3>
                <button 
                  className="modal-close"
                  onClick={() => setShowDayDetail(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="time-slots-day">
                <div className="time-slots-day-header">
                  <h4 className="time-slots-title">
                    {!selectedHour ? 'Seleziona l\'ora' : `Seleziona i minuti per le ${convertItalyTimeToUserTime(selectedDate, `${selectedHour}:00`, userTimezone).split(':')[0]}:00`}
                  </h4>
                  {selectedHour && (
                    <button
                      onClick={() => {
                        setSelectedHour("");
                        setSelectedMinute("");
                      }}
                      className="time-slot back-slot"
                      aria-label="Torna alla selezione ora"
                    >
                      <div className="time-display">
                        <span className="italy-time flecha" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" focusable="false" style={{ display: 'inline', verticalAlign: 'middle' }}>
                            <path d="M12.5 16L7 10.5L12.5 5" stroke="#2a2a2a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      </div>
                    </button>
                  )}
                </div>


                {!selectedHour ? (
                  // Mostrar selección de horas
                  <div className="time-grid">
                    {getAvailableHours(selectedDate).map((hour) => {
                      const userHour = convertItalyTimeToUserTime(selectedDate, `${hour}:00`, userTimezone).split(':')[0];
                      
                      // Contar minutos con reservas propias y ocupados por otros
                      const ownBookingMinutes = ["00", "20", "40"].filter(minute => 
                        isUserOwnBooking(selectedDate, `${hour}:${minute}`)
                      ).length;
                      
                      const occupiedMinutes = ["00", "20", "40"].filter(minute => 
                        isOccupiedByOthers(selectedDate, `${hour}:${minute}`)
                      ).length;
                      
                      const availableMinutes = 3 - ownBookingMinutes - occupiedMinutes;
                      
                      // Solo deshabilitar si TODOS los minutos están ocupados (por el usuario o por otros)
                      const isCompletelyUnavailable = availableMinutes === 0;
                      
                      // Determinar clase CSS basado en el estado predominante
                      let slotClass = '';
                      if (ownBookingMinutes === 3) {
                        slotClass = 'own-booking'; // Toda la hora es del usuario
                      } else if (occupiedMinutes === 3) {
                        slotClass = 'occupied-by-others'; // Toda la hora está ocupada por otros
                      } else if (ownBookingMinutes > 0 && occupiedMinutes > 0) {
                        slotClass = ''; // Mixto - mostrar normal para que puedan explorar
                      } else if (ownBookingMinutes > 0) {
                        slotClass = ''; // Parcialmente del usuario - mostrar normal
                      } else if (occupiedMinutes > 0) {
                        slotClass = ''; // Parcialmente ocupado - mostrar normal
                      }
                      
                      return (
                        <button
                          key={hour}
                          onClick={isCompletelyUnavailable ? undefined : () => handleHourSelect(hour)}
                          className={`time-slot hour-slot ${slotClass}`}
                          disabled={isCompletelyUnavailable}
                        >
                          <div className="time-display">
                            <span className="italy-time">{userHour}:00</span>
                            {availableMinutes > 0 && (ownBookingMinutes > 0 || occupiedMinutes > 0) && (
                              <span className="availability-info">{availableMinutes}/3 disponibles</span>
                            )}
                            {ownBookingMinutes === 3 && (
                              <span className="own-booking-label">Prenotato</span>
                            )}
                            {occupiedMinutes === 3 && (
                              <span className="occupied-by-others-label">Occupato</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Mostrar selección de minutos para la hora seleccionada
                  <div className="time-grid">
                    {getAvailableMinutes(selectedDate, selectedHour).map((minute) => {
                      const fullTime = `${selectedHour}:${minute}`;
                      const userTime = convertItalyTimeToUserTime(selectedDate, fullTime, userTimezone);
                      const isOwnBooking = isUserOwnBooking(selectedDate, fullTime);
                      const isOccupiedByOther = isOccupiedByOthers(selectedDate, fullTime);
                      
                      const isDisabled = isOwnBooking || isOccupiedByOther;
                      const slotClass = isOwnBooking ? 'own-booking' : (isOccupiedByOther ? 'occupied-by-others' : '');
                      
                      return (
                        <button
                          key={minute}
                          onClick={isDisabled ? undefined : () => handleMinuteSelect(minute)}
                          className={`time-slot minute-slot ${slotClass}`}
                          disabled={isDisabled}
                        >
                          <div className="time-display">
                            <span className="italy-time">{userTime}</span>
                            {isOwnBooking && (
                              <span className="own-booking-label">Prenotato</span>
                            )}
                            {isOccupiedByOther && !isOwnBooking && (
                              <span className="occupied-by-others-label">Occupato</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    
                    {/* Botón para volver a selección de hora */}

                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && (
          <div className="modal-overlay" onClick={() => {
            setShowBookingModal(false);
            setBookingError("");
            setSelectedHour("");
            setSelectedMinute("");
            setSelectedTime("");
          }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              {bookingSuccess ? (
                <div className="booking-success">
                  <div className="success-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2a2a2a" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22,4 12,14.01 9,11.01"/>
                    </svg>
                  </div>
                  <h3>Grazie per aver prenotato!</h3>
                  <p>La tua prenotazione è stata confermata. Presto riceverai un'email con tutte le informazioni della chiamata.</p>
                  <div className="success-actions">
                    <button 
                      className="modal-btn primary"
                      onClick={() => navigate('/wesleycaicedo')}
                    >
                      Torna alla Home
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="modal-header">
                    <h3>Conferma Prenotazione</h3>
                    <button 
                      className="modal-close"
                      onClick={() => {
                        setShowBookingModal(false);
                        setBookingError("");
                        setSelectedHour("");
                        setSelectedMinute("");
                        setSelectedTime("");
                      }}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="booking-details">
                    <p><strong>Data:</strong> {(() => {
                      const [year, month, day] = selectedDate.split('-').map(Number);
                      const date = new Date(year, month - 1, day);
                      return date.toLocaleDateString('it-IT', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      });
                    })()}</p>
                    
                    {selectedTime && (
                      <p><strong>Ora:</strong> {convertItalyTimeToUserTime(selectedDate, selectedTime, userTimezone)}</p>
                    )}
                    
                  </div>

                  {bookingError && (
                    <div className="booking-error">
                      <div className="error-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="15" y1="9" x2="9" y2="15"/>
                          <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                      </div>
                      <p>{bookingError}</p>
                    </div>
                  )}

                  <form onSubmit={handleBooking} className="booking-form">
                    <div className="modal-actions">
                      <button 
                        type="button" 
                        className="modal-btn secondary"
                        onClick={() => {
                          setShowBookingModal(false);
                          setBookingError("");
                          setSelectedHour("");
                          setSelectedMinute("");
                          setSelectedTime("");
                        }}
                      >
                        Annulla
                      </button>
                      <button 
                        type="submit" 
                        className="modal-btn primary"
                        disabled={isBooking}
                      >
                        {isBooking ? (
                          <>
                            <span className="loading-spinner"></span>
                            Prenotando...
                          </>
                        ) : (
                          'Conferma Prenotazione'
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}