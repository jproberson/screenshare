import {getRoomIdFromURL} from './utils.js';

export async function loadRooms() {
    const currentRoomId = getRoomIdFromURL(); // assuming this function returns the current room id from URL
    try {
      const response = await fetch('/rooms');
      const rooms = await response.json();
      let roomList = document.getElementById('roomList');
      roomList.innerHTML = '';
  
      rooms.forEach(room => {
        const userCount = room.users.length;
        const roomDiv = document.createElement('div');
        roomDiv.className = 'room';
        roomDiv.id = `room-${room.id}`;
        roomDiv.textContent = `${room.id} (${userCount})`;
        
        // Apply a different style if this is the current room
        if (room.id === currentRoomId) {
          roomDiv.classList.add('current-room');
        }
  
        roomDiv.addEventListener('click', () => changeRoom(room.id));
        roomList.appendChild(roomDiv);
      });
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  }
  
  function changeRoom(roomId) {
    const newUrl = window.location.origin + window.location.pathname + '?room=' + roomId;
    window.location.href = newUrl;
  }
  