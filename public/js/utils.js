export function getRoomIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    return roomId || "room-1";
}


export function handleError(error, message = "An error occurred") {
    console.error(message, error);
    // TODO:Update the UI to inform the user of the error.
}

