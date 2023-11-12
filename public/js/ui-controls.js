export function adjustUIForStreaming(isSharing, socket, sharerId) {
  const videoContainer = document.querySelector(".video-container");
  const shareScreenBtn = document.getElementById("share-screen-btn");

  // Logic for sharer
  if (isSharing && sharerId === socket.id) {
    videoContainer.style.display = "none";
    shareScreenBtn.textContent = "Stop Sharing";
    shareScreenBtn.style.display = "block";
  } else if (isSharing && sharerId !== socket.id) {
    videoContainer.style.display = "flex";
    shareScreenBtn.style.display = "none"; // Viewer should not see the share button
  } else {
    // If there is no active stream, hide the video container and center the share button
    videoContainer.style.display = "none";
    shareScreenBtn.textContent = "Share Screen";
    shareScreenBtn.style.display = "block";
  }
}

export function updateButtonUI(isSharing) {
  const btn = document.getElementById("share-screen-btn");
  btn.textContent = isSharing ? "Stop Sharing" : "Share Screen";
}
