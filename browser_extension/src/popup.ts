'use strict';

import './popup.css';

function initializePopup(): void {
  chrome.runtime.sendMessage(
    { action: 'GET_TRACKING_STATUS' },
    (response: { isTracking: boolean }) => {
      updateTrackingStatus(response.isTracking);
    }
  );

  chrome.runtime.sendMessage(
    { action: 'GET_NOT_SCORED_SEARCH_QUERIES' },
    (response: { queries?: string[] }) => {
      console.log('Not scored search queries in popup:', response);
      if (response && response.queries) {
        renderScoreBoards(response.queries);
      }
    }
  );
}

// Call initializePopup when the popup is opened
document.addEventListener('DOMContentLoaded', initializePopup);

document.getElementById('startStop')?.addEventListener('click', () => {
  chrome.runtime.sendMessage(
    {
      action: 'TOGGLE_PERMISSION',
    },
    (response: { isTracking: boolean }) => {
      updateTrackingStatus(response.isTracking);
    }
  );
});

document.getElementById('seeStats')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'stats.html' });
});

/**
 * Render the score boards for all search events
 */
function renderScoreBoards(queries: string[]): void {
  console.log('Rendering score boards', queries);
  const container = document.querySelector('.score-buttons');
  if (container) {
    container.innerHTML = ''; // Clear existing content

    queries.forEach((query) => {
      const scoreBoard = document.createElement('div');
      scoreBoard.classList.add('score-board');
      scoreBoard.innerHTML = `
        <p>Query: ${query}</p>
        <p>Rate your last search:</p>
        <button class="score" data-score="1">1</button>
        <button class="score" data-score="2">2</button>
        <button class="score" data-score="3">3</button>
        <button class="score" data-score="4">4</button>
        <button class="score" data-score="5">5</button>
      `;
      container.appendChild(scoreBoard);

      // Add event listeners for the new score buttons
      scoreBoard.querySelectorAll('.score').forEach((button) => {
        button.addEventListener('click', () => {
          const score = parseInt(button.getAttribute('data-score') || '0', 10);
          chrome.runtime.sendMessage(
            {
              action: 'UPDATE_SEARCH_QUERY_SCORE',
              event: {
                searchQuery: query,
                score: score,
              },
            },
            (response: { queries?: string[] }) => {
              if (response.queries) {
                renderScoreBoards(response.queries);
              }
            }
          );
        });
      });
    });
  }
}

function updateTrackingStatus(isTracking: boolean): void {
  console.log('UI updateTrackingStatus', isTracking);
  const startStopElement = document.getElementById('startStop');
  if (startStopElement) {
    startStopElement.textContent = isTracking
      ? 'Stop Tracking'
      : 'Start Tracking';
  }
}
