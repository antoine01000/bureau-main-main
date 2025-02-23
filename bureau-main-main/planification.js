/**************************************************************
 * planification.js - Page Planification
 **************************************************************/
const supabase = window.supabaseClient;

/**
 * Récupère toutes les pièces (rooms) et leurs tâches associées.
 */
async function fetchRoomsWithTasks() {
  // Récupère toutes les pièces
  const { data: allRooms, error: err1 } = await supabase.from('rooms').select('*');
  if (err1) {
    console.error("Erreur fetchRooms:", err1);
    return [];
  }
  // Récupère toutes les tâches
  const { data: allTasks, error: err2 } = await supabase.from('tasks').select('*');
  if (err2) {
    console.error("Erreur fetchTasks:", err2);
    return [];
  }
  // Associe pour chaque room ses tâches
  const roomsWithTasks = allRooms.map(room => ({
    ...room,
    tasks: allTasks.filter(t => t.room_id === room.id)
  }));
  return roomsWithTasks;
}

/**
 * Initialise le calendrier FullCalendar avec la liste d’événements
 */
function initCalendar(events) {
  const calendarEl = document.getElementById('calendarContainer');

  // Crée l'instance FullCalendar
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'fr', // Pour avoir les libellés en français
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listWeek'
    },
    events: events,
    eventClick: function(info) {
      const eventObj = info.event;
      alert(
        `Tâche : ${eventObj.title}\n` +
        `Pièce : ${eventObj.extendedProps.roomName || ''}\n` +
        `Statut : ${eventObj.extendedProps.status || ''}`
      );
    }
  });

  // Affiche le calendrier
  calendar.render();
}

/**
 * Affiche la planification sous forme de liste, puis initialise le calendrier.
 */
async function renderPlanification() {
  const container = document.getElementById('planificationContainer');
  container.innerHTML = '';

  const rooms = await fetchRoomsWithTasks();

  // Construction du tableau d'events pour FullCalendar
  const events = [];

  rooms.forEach(room => {
    // Affichage "liste" existant
    const roomDiv = document.createElement('div');
    roomDiv.classList.add('room-block');

    const roomTitle = document.createElement('h2');
    roomTitle.textContent = room.name;
    roomDiv.appendChild(roomTitle);

    if (room.tasks && room.tasks.length > 0) {
      const ul = document.createElement('ul');
      room.tasks.forEach(task => {
        const li = document.createElement('li');
        li.textContent = `${task.name} [${task.status || ''}]`;
        ul.appendChild(li);

        // Si la tâche possède une date limite, on la transforme en event
        if (task.deadline) {
          events.push({
            title: `${task.name} - ${task.assignee || ''}`,
            start: task.deadline, 
            extendedProps: {
              roomName: room.name,
              status: task.status,
              repetition: task.repetition
            }
          });
        }
      });
      roomDiv.appendChild(ul);
    } else {
      const p = document.createElement('p');
      p.textContent = 'Aucune tâche pour cette pièce.';
      roomDiv.appendChild(p);
    }
    container.appendChild(roomDiv);
  });

  // Initialise le calendrier avec les events
  initCalendar(events);
}

// Appel initial
renderPlanification();
