import { Multiplayer } from './modules/Multiplayer.js';

const multiplayer = new Multiplayer();
let gameCode = null;
let playerName = 'bastienbo';
let playerColor = 'blue';
let players = []; // Liste des joueurs connectés

// Mapping des couleurs vers les emojis
const colorEmojis = {
    'black': '⚫',
    'red': '🔴',
    'pink': '🩷',
    'green': '🟢',
    'blue': '🔵',
    'yellow': '🟡'
};

// ✅ Gestion du pseudo
document.getElementById('pseudo-input').addEventListener('input', (e) => {
    playerName = e.target.value.trim() || 'Joueur';
});

// Gestion du choix de couleur
const colorOptions = document.querySelectorAll('.color-option');
colorOptions.forEach(option => {
    option.addEventListener('click', () => {
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        const input = option.querySelector('input');
        input.checked = true;
        playerColor = input.value;
    });
});

// Gestion des toggles
const toggles = document.querySelectorAll('input[type="checkbox"]');
toggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
        console.log(`${toggle.id} : ${toggle.checked}`);
    });
});

// Gestion des radios
const radios = document.querySelectorAll('input[type="radio"]');
radios.forEach(radio => {
    radio.addEventListener('change', () => {
        console.log(`${radio.name} : ${radio.value}`);
    });
});

// ✅ Fonction pour mettre à jour la liste des joueurs
function updatePlayersList() {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    
    if (players.length === 0) {
        playersList.innerHTML = '<div class="player-slot empty"><span class="player-name">En attente de joueurs...</span></div>';
        return;
    }
    
    players.forEach((player, index) => {
        const slot = document.createElement('div');
        slot.className = 'player-slot';
        slot.innerHTML = `
            <span class="player-name">${player.name}</span>
            <span class="player-meeple">${colorEmojis[player.color] || '⚪'}</span>
        `;
        playersList.appendChild(slot);
    });
    
    // Ajouter des slots vides jusqu'à 6
    for (let i = players.length; i < 6; i++) {
        const slot = document.createElement('div');
        slot.className = 'player-slot empty';
        slot.innerHTML = '<span class="player-name">En attente...</span>';
        playersList.appendChild(slot);
    }
}

// ✅ Créer une partie
document.getElementById('create-game-btn').addEventListener('click', async () => {
    if (!playerName) {
        alert('Veuillez entrer un pseudo !');
        return;
    }
    
    try {
        gameCode = await multiplayer.createGame();
        
        // Afficher le code avec le bouton copier
        document.getElementById('game-code-container').style.display = 'block';
        document.getElementById('game-code-text').textContent = `Code: ${gameCode}`;
        
        // Ajouter le joueur hôte
        players.push({
            id: multiplayer.playerId,
            name: playerName,
            color: playerColor,
            isHost: true
        });
        updatePlayersList();
        
        console.log('🎮 Partie créée ! Code:', gameCode);
        
        // Callbacks
        multiplayer.onPlayerJoined = (playerId) => {
            console.log('👤 Nouveau joueur connecté:', playerId);
        };
        
        multiplayer.onDataReceived = (data, from) => {
            console.log('📨 Reçu de', from, ':', data);
            
            if (data.type === 'player-info') {
                // Un joueur envoie ses infos
                players.push({
                    id: from,
                    name: data.name,
                    color: data.color,
                    isHost: false
                });
                updatePlayersList();
                
                // Envoyer la liste complète à tout le monde
                multiplayer.broadcast({
                    type: 'players-update',
                    players: players
                });
            }
        };
        
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur lors de la création de la partie: ' + error.message);
    }
});

// ✅ Bouton copier le code
document.getElementById('copy-code-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(gameCode).then(() => {
        const btn = document.getElementById('copy-code-btn');
        btn.textContent = '✅ Copié !';
        setTimeout(() => {
            btn.textContent = '📋 Copier';
        }, 2000);
    }).catch(err => {
        console.error('Erreur copie:', err);
    });
});

// ✅ Rejoindre une partie - Ouvrir la modale
document.getElementById('join-game-btn').addEventListener('click', () => {
    if (!playerName) {
        alert('Veuillez entrer un pseudo !');
        return;
    }
    
    document.getElementById('join-modal').style.display = 'flex';
    document.getElementById('join-code-input').value = '';
    document.getElementById('join-error').style.display = 'none';
    document.getElementById('join-code-input').focus();
});

// ✅ Rejoindre - Confirmer
document.getElementById('join-confirm-btn').addEventListener('click', async () => {
    const code = document.getElementById('join-code-input').value.trim();
    
    if (!code) {
        showJoinError('Veuillez entrer un code !');
        return;
    }
    
    try {
        await multiplayer.joinGame(code);
        
        // Fermer la modale
        document.getElementById('join-modal').style.display = 'none';
        
        console.log('✅ Connecté à la partie !');
        
        // Envoyer nos infos à l'hôte
        multiplayer.broadcast({
            type: 'player-info',
            name: playerName,
            color: playerColor
        });
        
        multiplayer.onDataReceived = (data, from) => {
            console.log('📨 Reçu:', data);
            
            if (data.type === 'welcome') {
                console.log('🎉', data.message);
            }
            
            if (data.type === 'players-update') {
                // Mise à jour de la liste des joueurs
                players = data.players;
                updatePlayersList();
            }
        };
        
    } catch (error) {
        console.error('Erreur de connexion:', error);
        showJoinError('Impossible de rejoindre: ' + error.message);
    }
});

// ✅ Rejoindre - Annuler
document.getElementById('join-cancel-btn').addEventListener('click', () => {
    document.getElementById('join-modal').style.display = 'none';
});

// ✅ Fonctions d'affichage d'erreur
function showJoinError(message) {
    const errorEl = document.getElementById('join-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function showError(message) {
    // Pour les erreurs générales, on peut utiliser un toast ou une notification
    console.error(message);
    alert(message); // Temporaire, à améliorer plus tard
}

console.log('Page d\'accueil chargée');
