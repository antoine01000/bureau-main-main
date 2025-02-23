/**************************************************************
 * script.js - Page principale (Gestion des Tâches Ménagères)
 **************************************************************/
const supabase = window.supabaseClient;

// Sélecteurs DOM
const roomSelect = document.getElementById('roomSelect');
const taskSuggestions = document.getElementById('taskSuggestions');
const assigneeSelect = document.getElementById('assigneeSelect');
const statusSelect = document.getElementById('statusSelect');
const repetitionSelect = document.getElementById('repetitionSelect');
const deadlineInput = document.getElementById('deadline');
const addTaskButton = document.getElementById('addTask');
const taskList = document.getElementById('taskList');
const filterButtons = document.querySelectorAll('.filter-btn');

// Modal elements
const editModal = document.getElementById('editModal');
const editTaskNameInput = document.getElementById('editTaskName');
const editTaskAssigneeSelect = document.getElementById('editTaskAssignee');
const editTaskStatusSelect = document.getElementById('editTaskStatus');
const editTaskRepetitionSelect = document.getElementById('editTaskRepetition');
const editTaskDeadlineInput = document.getElementById('editTaskDeadline');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

let currentEditingTaskId = null; // Pour suivre la tâche en cours d'édition

/* --- Fonctions Supabase --- */
async function fetchRooms() {
  const { data, error } = await supabase.from('rooms').select('*');
  if (error) { console.error("Erreur fetchRooms:", error); return []; }
  return data;
}

async function fetchTaskSuggestions(roomKey) {
  const { data, error } = await supabase
    .from('task_suggestions')
    .select('*')
    .eq('room', roomKey)
    .order('id', { ascending: true });
  if (error) { console.error("Erreur fetchTaskSuggestions:", error); return []; }
  return data;
}

async function fetchTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, rooms(name)');
  if (error) { console.error("Erreur fetchTasks:", error); return []; }
  return data;
}

async function fetchPeople() {
  const { data, error } = await supabase.from('people').select('*');
  if (error) { console.error("Erreur fetchPeople:", error); return []; }
  return data;
}

async function insertTask(taskName, assignee, roomId, status, repetition, deadline) {
  const { data, error } = await supabase
    .from('tasks')
    .insert([{
      name: taskName,
      assignee: assignee,
      room_id: parseInt(roomId),
      status: status,
      repetition: repetition,
      deadline: deadline // <= on stocke bien la date
    }])
    .select();
  if (error) { console.error("Erreur insertTask:", error); }
  else { console.log("Tâche insérée :", data); }
  return data;
}

async function deleteTaskInDB(taskId) {
  const { data, error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  if (error) { console.error("Erreur deleteTaskInDB:", error); }
  return data;
}

async function updateTask(taskId, updatedFields) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updatedFields)
    .eq('id', taskId)
    .select();
  if (error) { console.error("Erreur updateTask:", error); return null; }
  return data;
}

/* --- Fonction utilitaire --- */
function computeDeadline(repetition) {
  let daysToAdd = 0;
  switch(repetition) {
    case 'hebdomadaire': daysToAdd = 7; break;
    case 'mensuel': daysToAdd = 30; break;
    case '3_mois': daysToAdd = 90; break;
    case '6_mois': daysToAdd = 180; break;
    case '1_an': daysToAdd = 360; break;
    default: daysToAdd = 0;
  }
  const today = new Date();
  today.setDate(today.getDate() + daysToAdd);
  return today.toISOString().split('T')[0];
}

/* --- Fonctions de rendu --- */
async function renderRooms() {
  roomSelect.innerHTML = '<option value="">Choisir une pièce...</option>';
  const rooms = await fetchRooms();
  rooms.forEach(room => {
    const option = document.createElement('option');
    option.value = room.id;
    option.textContent = room.name;
    roomSelect.appendChild(option);
  });
}

async function renderMembers() {
  assigneeSelect.innerHTML = '<option value="">Choisir une personne...</option>';
  editTaskAssigneeSelect.innerHTML = '<option value="">Choisir une personne...</option>';
  const people = await fetchPeople();
  people.forEach(person => {
    const option = document.createElement('option');
    option.value = person.name;
    option.textContent = person.name;
    assigneeSelect.appendChild(option);
    const modalOption = option.cloneNode(true);
    editTaskAssigneeSelect.appendChild(modalOption);
  });
}

async function renderTaskSuggestions() {
  taskSuggestions.innerHTML = '';
  const selectedRoomId = roomSelect.value;
  if (selectedRoomId) {
    const roomName = roomSelect.options[roomSelect.selectedIndex].text;
    const roomKey = roomName.toLowerCase().replace(/\s+/g, '_').replace(/[éèê]/g, 'e');
    const suggestions = await fetchTaskSuggestions(roomKey);
    taskSuggestions.disabled = false;
    if (suggestions.length > 0) {
      taskSuggestions.innerHTML = `<option value="">Choisir une tâche suggérée...</option>` +
        suggestions.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    } else {
      taskSuggestions.innerHTML = `<option value="">Aucune suggestion</option>`;
    }
  } else {
    taskSuggestions.disabled = true;
    taskSuggestions.innerHTML = `<option value="">Sélectionnez d'abord une pièce...</option>`;
  }
}

async function renderTasks(filter = 'active') {
  const tasks = await fetchTasks();
  console.log("Tâches récupérées :", tasks);
  const selectedRoomId = roomSelect.value;
  let filteredTasks = tasks;
  if (selectedRoomId) { filteredTasks = filteredTasks.filter(task => task.room_id == selectedRoomId); }
  if (filter === 'active') {
    filteredTasks = filteredTasks.filter(task => task.status !== 'terminé');
  } else if (filter !== 'all') {
    filteredTasks = filteredTasks.filter(task => task.status === filter);
  }
  taskList.innerHTML = '';
  if (filteredTasks.length === 0) {
    taskList.innerHTML = '<li>Aucune tâche</li>';
  } else {
    filteredTasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item';
      const roomName = task.rooms ? task.rooms.name : '';
      li.innerHTML = `
        <div class="task-info">
          <span class="task-name"><strong>Tâche :</strong> ${task.name}</span> | 
          <span class="task-assignee"><strong>Personne :</strong> ${task.assignee}</span> | 
          <span class="task-room"><strong>Pièce :</strong> ${roomName}</span> | 
          <span class="task-status"><strong>Statut :</strong> ${task.status}</span> | 
          <span class="task-repetition"><strong>Répétition :</strong> ${task.repetition || ''}</span> | 
          <span class="task-deadline"><strong>Date limite :</strong> ${task.deadline || ''}</span>
        </div>
        <div class="task-actions">
          <button class="delete-btn"><i class="fas fa-trash"></i></button>
          <button class="modify-btn"><i class="fas fa-edit"></i></button>
        </div>
      `;
      li.querySelector('.delete-btn').addEventListener('click', async () => {
        if (confirm("Voulez-vous vraiment supprimer cette tâche ?")) {
          await deleteTaskInDB(task.id);
          await renderTasks(filter);
        }
      });
      li.querySelector('.modify-btn').addEventListener('click', () => {
        openEditModal(task);
      });
      taskList.appendChild(li);
    });
  }
}

/* --- Fonctions de la modale d'édition --- */
function openEditModal(task) {
  currentEditingTaskId = task.id;
  editTaskNameInput.value = task.name;
  editTaskStatusSelect.value = task.status;
  editTaskRepetitionSelect.value = task.repetition || "";
  editTaskDeadlineInput.value = task.deadline || "";
  editTaskAssigneeSelect.value = task.assignee;
  editModal.style.display = "flex";
}

function closeEditModal() {
  editModal.style.display = "none";
  currentEditingTaskId = null;
}

/* --- Événements --- */
roomSelect.addEventListener('change', async () => {
  await renderTaskSuggestions();
  await renderTasks();
});

// Si on choisit une répétition, on calcule la date
repetitionSelect.addEventListener('change', () => {
  const rep = repetitionSelect.value;
  if (rep) {
    // On auto-calcule la date
    deadlineInput.value = computeDeadline(rep);
  }
});

addTaskButton.addEventListener('click', async () => {
  const roomId = roomSelect.value;
  // On prend pour nom de la tâche ce qui est dans taskSuggestions
  const taskName = taskSuggestions.value.trim();
  const assignee = assigneeSelect.value;
  const status = statusSelect.value;
  const repetition = repetitionSelect.value;
  const deadline = deadlineInput.value; // On récupère la date choisie
  
  if (roomId && taskName && assignee && status && repetition && deadline) {
    await insertTask(taskName, assignee, roomId, status, repetition, deadline);
    
    // Réinitialiser les champs de création
    roomSelect.value = "";
    taskSuggestions.innerHTML = `<option value="">Sélectionnez d'abord une pièce...</option>`;
    taskSuggestions.disabled = true;
    assigneeSelect.value = "";
    statusSelect.value = "";
    repetitionSelect.value = "";
    deadlineInput.value = "";
    
    // Réinitialiser les filtres
    filterButtons.forEach(btn => btn.classList.remove('active'));
    const defaultFilterButton = document.querySelector('.filter-btn[data-filter="active"]');
    if (defaultFilterButton) { defaultFilterButton.classList.add('active'); }
    
    await renderTaskSuggestions();
    await renderTasks();
  } else {
    alert("Veuillez remplir tous les champs.");
  }
});

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    renderTasks(button.dataset.filter);
  });
});

// Événements pour la modale d'édition
editTaskRepetitionSelect.addEventListener('change', () => {
  const rep = editTaskRepetitionSelect.value;
  if (rep) {
    editTaskDeadlineInput.value = computeDeadline(rep);
  }
});

saveEditBtn.addEventListener('click', async () => {
  const newName = editTaskNameInput.value.trim();
  const newAssignee = editTaskAssigneeSelect.value;
  const newStatus = editTaskStatusSelect.value;
  const newRepetition = editTaskRepetitionSelect.value;
  const newDeadline = editTaskDeadlineInput.value;
  
  if (newName && newAssignee && newStatus && newRepetition && newDeadline) {
    await updateTask(currentEditingTaskId, {
      name: newName,
      assignee: newAssignee,
      status: newStatus,
      repetition: newRepetition,
      deadline: newDeadline
    });
    await renderTasks();
    closeEditModal();
  } else {
    alert("Veuillez remplir tous les champs de modification.");
  }
});

cancelEditBtn.addEventListener('click', () => {
  closeEditModal();
});

/* --- Initialisation --- */
(async function init() {
  await renderRooms();
  await renderMembers();
  await renderTaskSuggestions();
  await renderTasks();
})();
