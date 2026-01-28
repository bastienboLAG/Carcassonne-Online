import { Multiplayer } from './modules/Multiplayer.js';

const multiplayer = new Multiplayer();
let gameCode = null;
let playerName = '';
let playerColor = 'blue';
let players = [];
let takenColors = [];
let inLobby = false; // ✅ NOUVEAU : Flag pour savoir si on est dans un lobby

// Mapping des couleurs vers les chemins d'images
const colorImages = {
    'black': './assets/Meeples/Black/Normal.png',
    'red': './assets/Meeples/Red/Normal.png',
    'pink': './assets/Meeples/Pink/Normal.png',
    'green': './assets/Meeples/Green/Normal.png',
    'blue': './assets/Meeples/Blue/Normal.png',
    'yellow': './assets/Meeples/Yellow/Normal.png'
};

const allColors = ['black', 'red', 'pink', 'green', 'blue', 'yellow'];

// Gestion du pseudo
document.getElementById('pseudo-input').addEventListener('input', (e) => {
    playerName = e.target.value.trim();
});

// ✅ Fonction pour trouver une couleur disponible
function getAvailableColor() {
    for (const color of allColors) {
        if (!takenColors.includes(color)) {
            return color;
        }
    }
    return 'blue'; // Fallback
}

// ✅ Fonction pour mettre à jour les couleurs disponibles
function updateAvailableColors() {
    const colorOptions = document.querySelectorAll('.color-option');
    
    colorOptions.forEach(option => {
        const color = option.dataset.color;
        const input = option.querySelector('input');
        
        if (takenColors.includes(color) && color !== playerColor) {
            option.classList.add('disabled');
            input.disabled = true;
        } else {
            option.classList.remove('disabled');
            input.disabled = false;
        }
    });
}

// ✅ Fonction pour masquer/afficher les boutons
function updateLobbyUI() {
    const createBtn = document.getElementById('create-game-btn');
    const joinBtn = document.getElementById('join-game-btn');
    
    if (inLobby) {
        createBtn.style.display = 'none';
        joinBtn.style.display = 'none';
    } else {
        createBtn.style.display = 'block';
        joinBtn.style.display = 'block';
    }
}

// Gestion du choix de couleur
const colorOptions = document.querySelectorAll('.color-option');
colorOptions.forEach(option => {
    option.addEventListener('click', () => {
        if (option.classList.contains('disabled')) return;
        
        const oldColor = playerColor;
        
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        const input = option.querySelector('input');
        input.checked = true;
        playerColor = input.value;
        
        // ✅ Synchroniser le changement de couleur si connecté
        if (multiplayer.peer && multiplayer.peer.open) {
            // Mettre à jour localement
            const me = players.find(p => p.id === multiplayer.playerId);
            if (me) {
                me.color = playerColor;
            }
            
            updatePlayersList();
            
            // Envoyer à tout le monde
            multiplayer.broadcast({
                type: 'color-change',
                playerId: multiplayer.playerId,
                color: playerColor
            });
        }
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

// Fonction pour mettre à jour la liste des joueurs
function updatePlayersList() {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    
    // Mettre à jour les couleurs prises
    takenColors = players.map(p => p.color);
    updateAvailableColors();
    
    if (players.length === 0) {
        playersList.innerHTML = '<div class="player-slot empty"><span class="player-name">En attente de joueurs...</span></div>';
        return;
    }
    
    players.forEach((player) => {
        const slot = document.createElement('div');
        slot.className = 'player-slot';
        slot.innerHTML = `
            <span class="player-name">${player.name}${player.isHost ? ' 👑' : ''}</span>
            <img src="${colorImages[player.color]}" class="player-meeple-img" alt="${player.color}">
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

// Créer une partie
document.getElementById('create-game-btn').addEventListener('click', async () => {
    if (!playerName) {
        alert('Veuillez entrer un pseudo !');
        return;
    }
    
    try {
        gameCode = await multiplayer.createGame();
        inLobby = true; // ✅ On est dans un lobby
        updateLobbyUI();
        
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
        
        multiplayer.onPlayerJoined = (playerId) => {
            console.log('👤 Nouveau joueur connecté (ID):', playerId);
        };
        
        multiplayer.onDataReceived = (data, from) => {
            console.log('📨 [HÔTE] Reçu:', data);
            
            if (data.type === 'player-info') {
                const existingPlayer = players.find(p => p.id === from);
                if (!existingPlayer) {
                    // ✅ Vérifier si la couleur est déjà prise
                    let assignedColor = data.color;
                    if (takenColors.includes(data.color)) {
                        assignedColor = getAvailableColor();
                        console.log(`⚠️ Couleur ${data.color} déjà prise, attribution de ${assignedColor}`);
                    }
                    
                    players.push({
                        id: from,
                        name: data.name,
                        color: assignedColor,
                        isHost: false
                    });
                    updatePlayersList();
                }
                
                // Envoyer la liste à tout le monde
                multiplayer.broadcast({
                    type: 'players-update',
                    players: players
                });
            }
            
            if (data.type === 'color-change') {
                const player = players.find(p => p.id === data.playerId);
                if (player) {
                    // ✅ Vérifier que la couleur n'est pas déjà prise par quelqu'un d'autre
                    const colorTaken = players.some(p => p.id !== data.playerId && p.color === data.color);
                    
                    if (!colorTaken) {
                        player.color = data.color;
                        updatePlayersList();
                        
                        // Redistribuer la liste
                        multiplayer.broadcast({
                            type: 'players-update',
                            players: players
                        });
                    }
                }
            }
        };
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        alert('Erreur lors de la création de la partie: ' + error.message);
        inLobby = false;
        updateLobbyUI();
    }
});

// Bouton copier le code
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

// Rejoindre une partie - Ouvrir la modale
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

// Rejoindre - Confirmer
document.getElementById('join-confirm-btn').addEventListener('click', async () => {
    const code = document.getElementById('join-code-input').value.trim();
    
    if (!code) {
        showJoinError('Veuillez entrer un code !');
        return;
    }
    
    try {
        multiplayer.onDataReceived = (data, from) => {
            console.log('📨 [INVITÉ] Reçu:', data);
            
            if (data.type === 'welcome') {
                console.log('🎉', data.message);
            }
            
            if (data.type === 'players-update') {
                players = data.players;
                
                // ✅ Mettre à jour ma couleur si elle a été changée par l'hôte
                const me = players.find(p => p.id === multiplayer.playerId);
                if (me && me.color !== playerColor) {
                    playerColor = me.color;
                    // Sélectionner visuellement la bonne couleur
                    const colorOption = document.querySelector(`.color-option[data-color="${playerColor}"]`);
                    if (colorOption) {
                        colorOptions.forEach(opt => opt.classList.remove('selected'));
                        colorOption.classList.add('selected');
                        colorOption.querySelector('input').checked = true;
                    }
                }
                
                updatePlayersList();
            }
        };
        
        await multiplayer.joinGame(code);
        document.getElementById('join-modal').style.display = 'none';
        inLobby = true; // ✅ On est dans un lobby
        updateLobbyUI();
        
        setTimeout(() => {
            multiplayer.broadcast({
                type: 'player-info',
                name: playerName,
                color: playerColor
            });
        }, 500);
        
    } catch (error) {
        console.error('❌ Erreur de connexion:', error);
        showJoinError('Impossible de rejoindre: ' + error.message);
    }
});

// Rejoindre - Annuler
document.getElementById('join-cancel-btn').addEventListener('click', () => {
    document.getElementById('join-modal').style.display = 'none';
});

function showJoinError(message) {
    const errorEl = document.getElementById('join-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

console.log('Page d\'accueil chargée');
