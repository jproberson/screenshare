export function adjustUIForStreaming(isSharing, socket, sharerId) {
  const videoContainer = document.querySelector(".video-container");
  const shareScreenBtn = document.getElementById("share-screen-btn");

  if (isSharing && sharerId === socket.id) {
    videoContainer.style.display = "none";
    shareScreenBtn.textContent = "Stop Sharing";
    shareScreenBtn.style.display = "block";
  } else if (isSharing && sharerId !== socket.id) {
    videoContainer.style.display = "flex";
    shareScreenBtn.style.display = "none";
  } else {
    videoContainer.style.display = "none";
    shareScreenBtn.textContent = "Share Screen";
    shareScreenBtn.style.display = "block";
  }
}

export function updateButtonUI(isSharing) {
  const btn = document.getElementById("share-screen-btn");
  btn.textContent = isSharing ? "Stop Sharing" : "Share Screen";
}
