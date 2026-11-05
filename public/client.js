// Firebase configuration (Client SDK)
// Asenda oma Firebase konsoolist saadud parameetritega
const firebaseConfig = {
  apiKey: "AIzaSyDummyKey-ReplaceWithYourOwn",
  authDomain: "your-project-id.firebaseapp.com",
  databaseURL: "https://your-project-id-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (e) {
    console.warn('Firebase init error (likely placeholder credentials):', e.message);
  }
}

const db = firebase.apps.length ? firebase.database() : null;
const messagesList = document.getElementById('messagesList');
const chatForm = document.getElementById('chatForm');
const usernameInput = document.getElementById('usernameInput');
const messageInput = document.getElementById('messageInput');

// Remember username locally
const savedUser = localStorage.getItem('chat_username');
if (savedUser) {
  usernameInput.value = savedUser;
}

// Escape helper to prevent XSS (Bug Fix #1)
function escapeHtml(unsafe) {
  return (unsafe || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function appendMessage(item) {
  const currentUsername = usernameInput.value.trim();
  const isMine = currentUsername && item.username === currentUsername;
  
  const div = document.createElement('div');
  div.className = `msg-item ${isMine ? 'mine' : ''}`;

  const timeFormatted = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  div.innerHTML = `
    <div class="msg-meta">
      <span>${escapeHtml(item.username)}</span>
      <span class="msg-time">${timeFormatted}</span>
    </div>
    <div class="msg-text">${escapeHtml(item.text)}</div>
  `;
  
  messagesList.appendChild(div);
  messagesList.scrollTop = messagesList.scrollHeight;
}

// Listen to Firebase Realtime Database
if (db) {
  const messagesRef = db.ref('messages');
  let isFirstLoad = true;

  messagesRef.limitToLast(50).on('child_added', (snapshot) => {
    if (isFirstLoad) {
      messagesList.innerHTML = '';
      isFirstLoad = false;
    }
    const data = snapshot.val();
    appendMessage(data);
  });
} else {
  messagesList.innerHTML = '<div class="system-message">Palun seadista Firebase config failis public/client.js</div>';
}

// Send message via backend API -> Redis
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const text = messageInput.value.trim();

  if (!username || !text) return;
  localStorage.setItem('chat_username', username);

  try {
    const res = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, text })
    });

    if (res.ok) {
      messageInput.value = '';
    } else {
      const err = await res.json();
      alert('Viga saatmisel: ' + (err.error || 'Server error'));
    }
  } catch (err) {
    console.error('Network error:', err);
    alert('Võrguviga sõnumi saatmisel!');
  }
});
