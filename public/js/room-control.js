import { getRoomIdFromURL } from "./utils.js";

export async function loadRooms() {
  const currentRoomId = getRoomIdFromURL();
  try {
    const response = await fetch("/rooms");
    const rooms = await response.json();
    let roomList = document.getElementById("roomList");
    roomList.innerHTML = "";

    for (const roomId in rooms) {
      if (rooms.hasOwnProperty(roomId)) {
        const room = rooms[roomId];
        const userCount = room.users.length;
        const roomDiv = document.createElement("div");
        roomDiv.className = "room";
        roomDiv.id = `room-${room.id}`;
        roomDiv.textContent = `${room.id} (${userCount})`;

        if (room.id === currentRoomId) {
          roomDiv.classList.add("current-room");
        }

        roomDiv.addEventListener("click", () => changeRoom(room.id));
        roomList.appendChild(roomDiv);
      }
    }
  } catch (error) {
    console.error("Error fetching rooms:", error);
  }
}

function changeRoom(roomId) {
  const newUrl =
    window.location.origin + window.location.pathname + "?room=" + roomId;
  window.location.href = newUrl;
}
