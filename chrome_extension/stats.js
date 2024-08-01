// Listen for the DOM content to be fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // Send a message to background.js to request data
  chrome.runtime.sendMessage({ action: "GET_ALL_EVENTS" }, function (response) {
    if (response.error) {
      alert("Failed to retrieve stats data");
      return;
    }
    if (response && response.events && response.scores) {
      parseScore(response.scores);
    }
  });
});
