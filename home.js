import { Multiplayer } from './modules/Multiplayer.js';
import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';
import { Deck } from './modules/Deck.js';
import { GameState } from './modules/GameState.js';
import { GameSync } from './modules/GameSync.js';

// ========== VARIABLES LOBBY ==========
const multiplayer = new Multiplayer();
let gameCode = null;
let playerName = '';
let playerColor = 'blue';
let players = [];
let takenColors = [];
let inLobby = false;
let isHost = false;

// ========== VARIABLES JEU ==========
const plateau = new Board();
const deck = new Deck();
let gameState = null;
let gameSync = null;
let tuileEnMain = null;
let tuilePosee = false;
let zoomLevel = 1;
let firstTilePlaced = false;
let isMyTurn = false;

// ✅ NOUVEAU : Variables pour les meeples
let lastPlacedTile = null; // Dernière tuile posée {x, y}
let placedMeeples = {}; // Meeples placés: "x,y,position" => {type, color, playerId}

let isDragging = false;
let startX = 0;
let startY = 0;
let scrollLeft = 0;
let scrollTop = 0;

const colorImages = {
    'black': './assets/Meeples/Black/Normal.png',
    'red': './assets/Meeples/Red/Normal.png',
    'pink': './assets/Meeples/Pink/Normal.png',
    'green': './assets/Meeples/Green/Normal.png',
    'blue': './assets/Meeples/Blue/Normal.png',
    'yellow': './assets/Meeples/Yellow/Normal.png'
};

const allColors = ['black', 'red', 'pink', 'green', 'blue', 'yellow'];

// ========== FONCTIONS LOBBY ==========
document.getElementById('pseudo-input').addEventListener('input', (e) => {
    playerName = e.target.value.trim();
});

function getAvailableColor() {
    for (const color of allColors) {
        if (!takenColors.includes(color)) {
            return color;
        }
    }
    return 'blue';
}

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

function updateColorPickerVisibility() {
    const colorPicker = document.querySelector('.color-picker');
    
    if (inLobby) {
        colorPicker.style.display = 'block';
    } else {
        colorPicker.style.display = 'none';
    }
}

function updateOptionsAccess() {
    const configInputs = document.querySelectorAll('.home-right input');
    const configLabels = document.querySelectorAll('.home-right label');
    const startButton = document.getElementById('start-game-btn');
    
    if (inLobby && !isHost) {
        configInputs.forEach(input => {
            input.disabled = true;
        });
        configLabels.forEach(label => {
            label.style.opacity = '0.5';
            label.style.pointerEvents = 'none';
        });
        
        if (startButton) {
            startButton.style.pointerEvents = 'none';
            startButton.style.opacity = '0.5';
            startButton.textContent = 'En attente de l\'hôte...';
        }
    } else if (inLobby && isHost) {
        configInputs.forEach(input => {
            input.disabled = false;
        });
        configLabels.forEach(label => {
            label.style.opacity = '1';
            label.style.pointerEvents = 'auto';
        });
        
        if (startButton) {
            startButton.style.pointerEvents = 'auto';
            startButton.style.opacity = '1';
            startButton.textContent = 'Démarrer la partie';
        }
    }
}

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
    
    updateColorPickerVisibility();
    updateOptionsAccess();
}

const colorOptions = document.querySelectorAll('.color-option');
colorOptions.forEach(option => {
    option.addEventListener('click', () => {
        if (option.classList.contains('disabled')) return;
        
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        const input = option.querySelector('input');
        input.checked = true;
        playerColor = input.value;
        
        if (multiplayer.peer && multiplayer.peer.open) {
            const me = players.find(p => p.id === multiplayer.playerId);
            if (me) {
                me.color = playerColor;
                updatePlayersList();
            }
            
            multiplayer.broadcast({
                type: 'color-change',
                playerId: multiplayer.playerId,
                color: playerColor
            });
        }
    });
});

function updatePlayersList() {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';
    
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
    
    for (let i = players.length; i < 6; i++) {
        const slot = document.createElement('div');
        slot.className = 'player-slot empty';
        slot.innerHTML = '<span class="player-name">En attente...</span>';
        playersList.appendChild(slot);
    }
}

document.getElementById('create-game-btn').addEventListener('click', async () => {
    if (!playerName) {
        alert('Veuillez entrer un pseudo !');
        return;
    }
    
    try {
        gameCode = await multiplayer.createGame();
        
        inLobby = true;
        isHost = true;
        updateLobbyUI();
        
        document.getElementById('game-code-container').style.display = 'block';
        document.getElementById('game-code-text').textContent = `Code: ${gameCode}`;
        
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
                    let assignedColor = data.color;
                    if (takenColors.includes(data.color)) {
                        assignedColor = getAvailableColor();
                    }
                    
                    players.push({
                        id: from,
                        name: data.name,
                        color: assignedColor,
                        isHost: false
                    });
                    updatePlayersList();
                }
                
                multiplayer.broadcast({
                    type: 'players-update',
                    players: players
                });
            }
            
            if (data.type === 'color-change') {
                console.log('🎨 Changement de couleur reçu:', data.playerId, '→', data.color);
                const player = players.find(p => p.id === data.playerId);
                if (player) {
                    const colorTaken = players.some(p => p.id !== data.playerId && p.color === data.color);
                    
                    if (!colorTaken) {
                        player.color = data.color;
                        updatePlayersList();
                        
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
        isHost = false;
        updateLobbyUI();
    }
});

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
                console.log('👥 Mise à jour liste joueurs:', data.players);
                players = data.players;
                
                const me = players.find(p => p.id === multiplayer.playerId);
                if (me && me.color !== playerColor) {
                    playerColor = me.color;
                    const colorOption = document.querySelector(`.color-option[data-color="${playerColor}"]`);
                    if (colorOption) {
                        colorOptions.forEach(opt => opt.classList.remove('selected'));
                        colorOption.classList.add('selected');
                        colorOption.querySelector('input').checked = true;
                    }
                }
                
                updatePlayersList();
            }
            
            if (data.type === 'color-change') {
                console.log('🎨 [INVITÉ] Changement de couleur reçu:', data.playerId, '→', data.color);
                const player = players.find(p => p.id === data.playerId);
                if (player) {
                    player.color = data.color;
                    updatePlayersList();
                }
            }
            
            // ✅ NOUVEAU : Écouter le signal de démarrage
            if (data.type === 'game-starting') {
                console.log('🎮 [INVITÉ] L\'hôte démarre la partie !');
                startGameForInvite();
            }
        };
        
        await multiplayer.joinGame(code);
        document.getElementById('join-modal').style.display = 'none';
        inLobby = true;
        isHost = false;
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

document.getElementById('join-cancel-btn').addEventListener('click', () => {
    document.getElementById('join-modal').style.display = 'none';
});

function showJoinError(message) {
    const errorEl = document.getElementById('join-error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

// ✅ NOUVEAU : Gérer le clic sur "Démarrer la partie"
document.getElementById('start-game-btn').addEventListener('click', async () => {
    if (!inLobby) return;
    
    console.log('🎮 Démarrage de la partie...');
    
    // Envoyer le signal aux invités
    if (isHost) {
        multiplayer.broadcast({
            type: 'game-starting',
            message: 'L\'hôte démarre la partie !'
        });
    }
    
    // Démarrer le jeu
    await startGame();
});

// ✅ FONCTION POUR DÉMARRER LE JEU
async function startGame() {
    console.log('🎮 [HÔTE] Initialisation du jeu...');
    
    // Cacher le lobby, afficher le jeu
    const lobbyPage = document.getElementById('lobby-page');
    const gamePage = document.getElementById('game-page');
    
    lobbyPage.style.display = 'none';
    gamePage.style.display = 'flex';
    
    console.log('✅ Lobby caché, page de jeu affichée');
    console.log('📏 Game page dimensions:', gamePage.offsetWidth, 'x', gamePage.offsetHeight);
    
    // Initialiser le GameState
    gameState = new GameState();
    players.forEach(player => {
        gameState.addPlayer(player.id, player.name, player.color);
    });
    console.log('👥 Joueurs ajoutés au GameState:', gameState.players);
    
    // Initialiser GameSync
    gameSync = new GameSync(multiplayer, gameState);
    gameSync.init();
    console.log('🔗 GameSync initialisé');
    
    // Callbacks pour les actions synchronisées
    gameSync.onGameStarted = (deckData, gameStateData) => {
        console.log('🎮 [INVITÉ] Pioche reçue !');
        
        // Restaurer la pioche
        deck.tiles = deckData.tiles;
        deck.currentIndex = deckData.currentIndex;
        deck.totalTiles = deckData.totalTiles;
        
        // Restaurer le GameState
        gameState.deserialize(gameStateData);
        
        // Piocher la première tuile
        piocherNouvelleTuile();
        mettreAJourCompteur();
        updateTurnDisplay();
    };
    
    gameSync.onTileRotated = (rotation) => {
        console.log('🔄 [SYNC] Rotation reçue:', rotation);
        if (tuileEnMain) {
            tuileEnMain.rotation = rotation;
            const currentImg = document.getElementById('current-tile-img');
            if (currentImg) {
                currentImg.style.transform = `rotate(${rotation}deg)`;
            }
            if (firstTilePlaced) {
                rafraichirTousLesSlots();
            }
        }
    };
    
    gameSync.onTilePlaced = (x, y, tileId, rotation) => {
        console.log('📍 [SYNC] Placement reçu:', x, y, tileId, rotation);
        
        const tileData = deck.tiles.find(t => t.id === tileId);
        if (tileData) {
            const tile = new Tile(tileData);
            tile.rotation = rotation;
            poserTuileSync(x, y, tile);
        }
    };
    
    gameSync.onTurnEnded = (nextPlayerIndex, gameStateData) => {
        console.log('⏭️ [SYNC] Fin de tour reçue');
        
        gameState.deserialize(gameStateData);
        piocherNouvelleTuile();
        updateTurnDisplay();
    };
    
    gameSync.onTileDrawn = (tileId, rotation, playerId) => {
        console.log('🎲 [SYNC] Tuile piochée:', tileId);
        
        // Créer la tuile à partir de l'ID
        const tileData = deck.tiles.find(t => t.id === tileId);
        if (tileData) {
            tuileEnMain = new Tile(tileData);
            tuileEnMain.rotation = rotation;
            
            // ✅ AFFICHER la tuile pour tout le monde
            const previewContainer = document.getElementById('tile-preview');
            previewContainer.innerHTML = `<img id="current-tile-img" src="${tuileEnMain.imagePath}" style="transform: rotate(${rotation}deg);">`;
            
            // Rafraîchir les slots
            if (firstTilePlaced) {
                rafraichirTousLesSlots();
            }
            
            mettreAJourCompteur();
        }
    };
    
    gameSync.onMeeplePlaced = (x, y, position, meepleType, color, playerId) => {
        console.log('🎭 [SYNC] Meeple placé par un autre joueur');
        
        const key = `${x},${y},${position}`;
        placedMeeples[key] = {
            type: meepleType,
            color: color,
            playerId: playerId
        };
        
        afficherMeeple(x, y, position, meepleType, color);
    };
    
    // Setup de l'interface
    console.log('🔧 Setup des event listeners...');
    setupEventListeners();
    console.log('🔧 Setup de la navigation...');
    setupNavigation(document.getElementById('board-container'), document.getElementById('board'));
    
    // Si on est l'hôte, charger et envoyer la pioche
    if (isHost) {
        console.log('👑 [HÔTE] Chargement de la pioche...');
        await deck.loadAllTiles();
        console.log('📦 Deck chargé par l\'hôte:', deck.tiles.length, 'tuiles');
        
        // Envoyer la pioche à tous les joueurs
        gameSync.startGame(deck);
        
        // Piocher la première tuile
        piocherNouvelleTuile();
        mettreAJourCompteur();
        updateTurnDisplay();
        
        // ✅ Créer le slot central APRÈS updateTurnDisplay (pour que isMyTurn soit défini)
        console.log('🎯 Appel de creerSlotCentral...');
        creerSlotCentral();
    } else {
        console.log('👤 [INVITÉ] En attente de la pioche...');
        afficherMessage('En attente de l\'hôte...');
    }
    
    console.log('✅ Initialisation terminée');
}

async function startGameForInvite() {
    console.log('🎮 [INVITÉ] Initialisation du jeu...');
    
    // Cacher le lobby, afficher le jeu
    document.getElementById('lobby-page').style.display = 'none';
    document.getElementById('game-page').style.display = 'flex';
    
    // Initialiser le GameState
    gameState = new GameState();
    players.forEach(player => {
        gameState.addPlayer(player.id, player.name, player.color);
    });
    
    // Initialiser GameSync
    gameSync = new GameSync(multiplayer, gameState);
    gameSync.init();
    
    // Callbacks
    gameSync.onGameStarted = (deckData, gameStateData) => {
        console.log('🎮 [INVITÉ] Pioche reçue !');
        deck.tiles = deckData.tiles;
        deck.currentIndex = deckData.currentIndex;
        deck.totalTiles = deckData.totalTiles;
        gameState.deserialize(gameStateData);
        piocherNouvelleTuile();
        mettreAJourCompteur();
        updateTurnDisplay();
        
        // ✅ Créer le slot central APRÈS avoir défini isMyTurn
        creerSlotCentral();
    };
    
    gameSync.onTileRotated = (rotation) => {
        if (tuileEnMain) {
            tuileEnMain.rotation = rotation;
            const currentImg = document.getElementById('current-tile-img');
            if (currentImg) {
                currentImg.style.transform = `rotate(${rotation}deg)`;
            }
            if (firstTilePlaced) rafraichirTousLesSlots();
        }
    };
    
    gameSync.onTilePlaced = (x, y, tileId, rotation) => {
        const tileData = deck.tiles.find(t => t.id === tileId);
        if (tileData) {
            const tile = new Tile(tileData);
            tile.rotation = rotation;
            poserTuileSync(x, y, tile);
        }
    };
    
    gameSync.onTurnEnded = (nextPlayerIndex, gameStateData) => {
        gameState.deserialize(gameStateData);
        piocherNouvelleTuile();
        updateTurnDisplay();
    };
    
    gameSync.onTileDrawn = (tileId, rotation, playerId) => {
        console.log('🎲 [SYNC] Tuile piochée:', tileId);
        
        const tileData = deck.tiles.find(t => t.id === tileId);
        if (tileData) {
            tuileEnMain = new Tile(tileData);
            tuileEnMain.rotation = rotation;
            
            const previewContainer = document.getElementById('tile-preview');
            previewContainer.innerHTML = `<img id="current-tile-img" src="${tuileEnMain.imagePath}" style="transform: rotate(${rotation}deg);">`;
            
            if (firstTilePlaced) {
                rafraichirTousLesSlots();
            }
            
            mettreAJourCompteur();
        }
    };
    
    gameSync.onMeeplePlaced = (x, y, position, meepleType, color, playerId) => {
        console.log('🎭 [SYNC] Meeple placé par un autre joueur');
        
        const key = `${x},${y},${position}`;
        placedMeeples[key] = {
            type: meepleType,
            color: color,
            playerId: playerId
        };
        
        afficherMeeple(x, y, position, meepleType, color);
    };
    
    setupEventListeners();
    setupNavigation(document.getElementById('board-container'), document.getElementById('board'));
    
    afficherMessage('En attente de l\'hôte...');
    
    // ✅ Le slot central sera créé quand l'invité recevra la pioche et que isMyTurn sera défini
}

// ========== FONCTIONS JEU ==========
function updateTurnDisplay() {
    if (!gameState || gameState.players.length === 0) {
        isMyTurn = true;
        return;
    }
    
    const currentPlayer = gameState.getCurrentPlayer();
    isMyTurn = currentPlayer.id === multiplayer.playerId;
    
    // Créer ou récupérer le conteneur de la liste des joueurs
    let playersDisplay = document.getElementById('players-display');
    if (!playersDisplay) {
        playersDisplay = document.createElement('div');
        playersDisplay.id = 'players-display';
        playersDisplay.style.cssText = 'padding: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; margin: 10px 0; width: 100%;';
        document.getElementById('game-ui').insertBefore(playersDisplay, document.getElementById('current-tile-container'));
    }
    
    // Construire la liste HTML
    let html = '<div style="font-size: 14px;">';
    
    gameState.players.forEach((player, index) => {
        const isActive = index === gameState.currentPlayerIndex;
        const meepleImg = colorImages[player.color];
        const indicator = isActive ? '▶' : '';
        const bgColor = isActive ? 'rgba(46, 204, 113, 0.2)' : 'transparent';
        
        html += `
            <div style="display: flex; align-items: center; gap: 8px; padding: 5px; margin: 3px 0; background: ${bgColor}; border-radius: 3px;">
                <span style="color: #2ecc71; font-weight: bold; width: 15px;">${indicator}</span>
                <img src="${meepleImg}" style="width: 24px; height: 24px;">
                <span style="flex: 1; color: ${isActive ? '#2ecc71' : '#ecf0f1'}; font-weight: ${isActive ? 'bold' : 'normal'};">${player.name}</span>
            </div>
        `;
    });
    
    html += '</div>';
    playersDisplay.innerHTML = html;
    
    // Mettre à jour l'état du bouton "Terminer mon tour"
    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) {
        endTurnBtn.disabled = !isMyTurn;
        if (!isMyTurn) {
            endTurnBtn.style.opacity = '0.5';
            endTurnBtn.style.cursor = 'not-allowed';
        } else {
            endTurnBtn.style.opacity = '1';
            endTurnBtn.style.cursor = 'pointer';
        }
    }
}

function afficherMessage(msg) {
    document.getElementById('tile-preview').innerHTML = `<p style="text-align: center; color: white;">${msg}</p>`;
}

function setupEventListeners() {
    document.getElementById('tile-preview').addEventListener('click', () => {
        if (!isMyTurn && gameSync) {
            console.log('⚠️ Pas votre tour !');
            return;
        }
        
        if (tuileEnMain && !tuilePosee) {
            const currentImg = document.getElementById('current-tile-img');
            tuileEnMain.rotation = (tuileEnMain.rotation + 90) % 360;
            const currentTransform = currentImg.style.transform;
            const currentDeg = parseInt(currentTransform.match(/rotate\((\d+)deg\)/)?.[1] || '0');
            const newDeg = currentDeg + 90;
            currentImg.style.transform = `rotate(${newDeg}deg)`;
            
            if (gameSync) {
                gameSync.syncTileRotation(tuileEnMain.rotation);
            }
            
            if (firstTilePlaced) {
                rafraichirTousLesSlots();
            }
        }
    });
    
    document.getElementById('end-turn-btn').onclick = () => {
        if (!isMyTurn && gameSync) {
            alert('Ce n\'est pas votre tour !');
            return;
        }
        
        if (!tuilePosee) {
            alert('Vous devez poser la tuile avant de terminer votre tour !');
            return;
        }
        
        console.log('⏭️ Fin de tour - passage au joueur suivant');
        
        // ✅ Nettoyer les curseurs de meeple
        document.querySelectorAll('.meeple-cursor').forEach(c => c.remove());
        lastPlacedTile = null;
        
        if (gameSync) {
            // Synchroniser la fin de tour (qui met à jour gameState.currentPlayerIndex)
            gameSync.syncTurnEnd();
        } else {
            // Mode solo : pas de GameState, on pioche direct
        }
        
        // ✅ IMPORTANT : Piocher la nouvelle tuile localement
        piocherNouvelleTuile();
        
        // Mettre à jour l'affichage du tour
        if (gameState) {
            updateTurnDisplay();
        }
    };
    
    document.getElementById('recenter-btn').onclick = () => {
        const container = document.getElementById('board-container');
        container.scrollLeft = 10400 - (container.clientWidth / 2);
        container.scrollTop = 10400 - (container.clientHeight / 2);
    };
    
    document.getElementById('back-to-lobby-btn').onclick = () => {
        if (confirm('Voulez-vous vraiment quitter la partie ?')) {
            location.reload();
        }
    };
}

function creerSlotCentral() {
    console.log('🎯 Création du slot central...');
    const board = document.getElementById('board');
    console.log('📋 Board element:', board);
    
    const slot = document.createElement('div');
    slot.className = "slot slot-central";
    slot.style.gridColumn = 50;
    slot.style.gridRow = 50;
    // ✅ ENLEVÉ le style gold inline - le CSS s'en charge
    
    // ✅ Appliquer le style readonly si ce n'est pas notre tour
    if (!isMyTurn && gameSync) {
        slot.classList.add('slot-readonly');
        slot.style.cursor = 'default';
        // Pas de onclick
        console.log('🔒 Slot central readonly (pas notre tour)');
    } else {
        slot.onclick = () => {
            if (tuileEnMain && !firstTilePlaced) {
                console.log('✅ Clic sur slot central - pose de la tuile');
                poserTuile(50, 50, tuileEnMain, true);
            }
        };
        console.log('✅ Slot central cliquable (notre tour)');
    }
    
    board.appendChild(slot);
    console.log('✅ Slot central ajouté au board');
}

function piocherNouvelleTuile() {
    console.log('🎲 Pioche d\'une nouvelle tuile...');
    const tileData = deck.draw();
    
    if (!tileData) {
        console.log('⚠️ Pioche vide !');
        alert('Partie terminée ! Plus de tuiles dans la pioche.');
        document.getElementById('tile-preview').innerHTML = '<p>Fin de partie</p>';
        document.getElementById('end-turn-btn').disabled = true;
        return;
    }

    console.log('🃏 Tuile piochée:', tileData.id);
    tuileEnMain = new Tile(tileData);
    tuileEnMain.rotation = 0;
    tuilePosee = false;

    // ✅ TOUT LE MONDE voit la tuile
    const previewContainer = document.getElementById('tile-preview');
    previewContainer.innerHTML = `<img id="current-tile-img" src="${tuileEnMain.imagePath}" style="cursor: pointer; transform: rotate(0deg);" title="Cliquez pour tourner">`;

    // ✅ Synchroniser la pioche si c'est notre tour
    if (isMyTurn && gameSync) {
        gameSync.syncTileDraw(tileData.id, 0);
    }

    if (firstTilePlaced) {
        rafraichirTousLesSlots();
    }
    
    mettreAJourCompteur();
    if (gameState) {
        updateTurnDisplay();
    }
}

function poserTuile(x, y, tile, isFirst = false) {
    if (!isFirst && !plateau.canPlaceTile(x, y, tile)) return;

    const boardElement = document.getElementById('board');
    const img = document.createElement('img');
    img.src = tile.imagePath;
    img.className = "tile";
    img.style.gridColumn = x;
    img.style.gridRow = y;
    img.style.transform = `rotate(${tile.rotation}deg)`;
    boardElement.appendChild(img);
    
    const copy = tile.clone();
    plateau.addTile(x, y, copy);

    if (isFirst) {
        console.log('✅ Première tuile posée');
        firstTilePlaced = true;
        tuilePosee = true;
        document.querySelectorAll('.slot').forEach(s => s.remove());
        
        // ✅ Afficher le verso après placement
        document.getElementById('tile-preview').innerHTML = '<img src="./assets/verso.png" style="width: 120px; border: 2px solid #666;">';
        
        if (gameSync) {
            gameSync.syncTilePlacement(x, y, tile);
        }
        
        // ✅ NOUVEAU : Sauvegarder la position de la dernière tuile posée
        lastPlacedTile = {x, y};
        
        tuileEnMain = null;
        rafraichirTousLesSlots();
        
        // ✅ NOUVEAU : Afficher les curseurs de meeple si c'est notre tour
        if (isMyTurn && gameSync) {
            afficherCurseursMeeple(x, y);
        }
    } else {
        tuilePosee = true;
        document.querySelectorAll('.slot').forEach(s => s.remove());
        
        // ✅ Afficher le verso après placement
        document.getElementById('tile-preview').innerHTML = '<img src="./assets/verso.png" style="width: 120px; border: 2px solid #666;">';
        
        if (gameSync) {
            gameSync.syncTilePlacement(x, y, tile);
        }
        
        // ✅ NOUVEAU : Sauvegarder la position de la dernière tuile posée
        lastPlacedTile = {x, y};
        
        tuileEnMain = null;
        
        // ✅ NOUVEAU : Afficher les curseurs de meeple si c'est notre tour
        if (isMyTurn && gameSync) {
            afficherCurseursMeeple(x, y);
        }
    }
}

function poserTuileSync(x, y, tile) {
    const boardElement = document.getElementById('board');
    const img = document.createElement('img');
    img.src = tile.imagePath;
    img.className = "tile";
    img.style.gridColumn = x;
    img.style.gridRow = y;
    img.style.transform = `rotate(${tile.rotation}deg)`;
    boardElement.appendChild(img);
    
    const copy = tile.clone();
    plateau.addTile(x, y, copy);

    if (!firstTilePlaced) {
        firstTilePlaced = true;
        tuilePosee = true;
        document.querySelectorAll('.slot').forEach(s => s.remove());
        document.getElementById('tile-preview').innerHTML = '<img src="./assets/verso.png" style="width: 120px; border: 2px solid #666;">';
        tuileEnMain = null;
        rafraichirTousLesSlots();
    } else {
        tuilePosee = true;
        document.querySelectorAll('.slot').forEach(s => s.remove());
        
        // ✅ Afficher le verso après placement synchronisé
        document.getElementById('tile-preview').innerHTML = '<img src="./assets/verso.png" style="width: 120px; border: 2px solid #666;">';
        
        tuileEnMain = null;
    }
}

function rafraichirTousLesSlots() {
    if (firstTilePlaced) {
        document.querySelectorAll('.slot:not(.slot-central)').forEach(s => s.remove());
    }
    
    if (!tuileEnMain) return;
    // ✅ CHANGEMENT : Afficher les slots même si ce n'est pas notre tour (en lecture seule)
    
    for (let coord in plateau.placedTiles) {
        const [x, y] = coord.split(',').map(Number);
        genererSlotsAutour(x, y);
    }
}

function genererSlotsAutour(x, y) {
    const directions = [{dx:0, dy:-1}, {dx:1, dy:0}, {dx:0, dy:1}, {dx:-1, dy:0}];
    directions.forEach(dir => {
        const nx = x + dir.dx, ny = y + dir.dy;
        if (tuileEnMain && plateau.isFree(nx, ny) && plateau.canPlaceTile(nx, ny, tuileEnMain)) {
            const slot = document.createElement('div');
            slot.className = "slot";
            slot.style.gridColumn = nx;
            slot.style.gridRow = ny;
            
            // ✅ Si ce n'est pas notre tour : même apparence mais sans onclick et sans hover gold
            if (!isMyTurn && gameSync) {
                slot.classList.add('slot-readonly');
                slot.style.cursor = 'default';
                // Pas de onclick pour les non-actifs
            } else {
                // ✅ Seulement le joueur actif a un onclick
                slot.onclick = () => {
                    poserTuile(nx, ny, tuileEnMain);
                };
            }
            
            document.getElementById('board').appendChild(slot);
        }
    });
}

function mettreAJourCompteur() {
    const remaining = deck.remaining();
    const total = deck.total();
    console.log(`📊 Compteur: ${remaining} / ${total}`);
    document.getElementById('tile-counter').textContent = `Tuiles : ${remaining} / ${total}`;
}

// ========== MEEPLES ==========

/**
 * Afficher les curseurs de placement de meeple sur une tuile
 */
function afficherCurseursMeeple(x, y) {
    console.log('🎯 Affichage des curseurs de meeple sur', x, y);
    
    // Nettoyer les anciens curseurs
    document.querySelectorAll('.meeple-cursor').forEach(c => c.remove());
    
    // Créer 25 curseurs (grille 5x5)
    for (let position = 1; position <= 25; position++) {
        const key = `${x},${y},${position}`;
        
        // Vérifier si la position est déjà occupée
        if (placedMeeples[key]) continue;
        
        const cursor = document.createElement('div');
        cursor.className = 'meeple-cursor';
        cursor.style.gridColumn = x;
        cursor.style.gridRow = y;
        
        // Calculer la position dans la grille 5x5
        const row = Math.floor((position - 1) / 5);
        const col = (position - 1) % 5;
        
        // Position relative dans la tuile (208x208px)
        const offsetX = col * 41.6 + 20.8; // 208/5 = 41.6, centré
        const offsetY = row * 41.6 + 20.8;
        
        cursor.style.position = 'absolute';
        cursor.style.left = `${offsetX}px`;
        cursor.style.top = `${offsetY}px`;
        cursor.style.width = '12px';
        cursor.style.height = '12px';
        cursor.style.borderRadius = '50%';
        cursor.style.backgroundColor = 'rgba(255, 215, 0, 0.6)';
        cursor.style.border = '2px solid gold';
        cursor.style.cursor = 'pointer';
        cursor.style.zIndex = '100';
        cursor.style.pointerEvents = 'auto';
        
        cursor.onmouseenter = () => {
            cursor.style.backgroundColor = 'rgba(255, 215, 0, 1)';
            cursor.style.transform = 'scale(1.3)';
        };
        
        cursor.onmouseleave = () => {
            cursor.style.backgroundColor = 'rgba(255, 215, 0, 0.6)';
            cursor.style.transform = 'scale(1)';
        };
        
        cursor.onclick = (e) => {
            e.stopPropagation();
            afficherSelecteurMeeple(x, y, position, e.clientX, e.clientY);
        };
        
        document.getElementById('board').appendChild(cursor);
    }
}

/**
 * Afficher le sélecteur de type de meeple (menu radial)
 */
function afficherSelecteurMeeple(x, y, position, mouseX, mouseY) {
    console.log('📋 Sélecteur de meeple à la position', position);
    
    // Nettoyer l'ancien sélecteur
    const oldSelector = document.getElementById('meeple-selector');
    if (oldSelector) oldSelector.remove();
    
    // Créer le sélecteur
    const selector = document.createElement('div');
    selector.id = 'meeple-selector';
    selector.style.position = 'fixed';
    selector.style.left = `${mouseX}px`;
    selector.style.top = `${mouseY}px`;
    selector.style.transform = 'translate(-50%, -50%)';
    selector.style.zIndex = '1000';
    selector.style.display = 'flex';
    selector.style.gap = '10px';
    selector.style.padding = '15px';
    selector.style.background = 'rgba(44, 62, 80, 0.95)';
    selector.style.borderRadius = '10px';
    selector.style.border = '2px solid gold';
    selector.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    
    // Types de meeples disponibles
    const meepleTypes = [
        { type: 'Normal', image: `./assets/Meeples/${getPlayerColor()}/Normal.png` }
        // Plus tard : Abbé, Grand, etc.
    ];
    
    meepleTypes.forEach(meeple => {
        const option = document.createElement('div');
        option.style.cursor = 'pointer';
        option.style.padding = '10px';
        option.style.borderRadius = '5px';
        option.style.transition = 'background 0.2s';
        
        const img = document.createElement('img');
        img.src = meeple.image;
        img.style.width = '40px';
        img.style.height = '40px';
        img.style.display = 'block';
        
        const label = document.createElement('div');
        label.textContent = meeple.type;
        label.style.textAlign = 'center';
        label.style.fontSize = '12px';
        label.style.marginTop = '5px';
        label.style.color = 'white';
        
        option.appendChild(img);
        option.appendChild(label);
        
        option.onmouseenter = () => {
            option.style.background = 'rgba(255, 215, 0, 0.2)';
        };
        
        option.onmouseleave = () => {
            option.style.background = 'transparent';
        };
        
        option.onclick = () => {
            placerMeeple(x, y, position, meeple.type);
            selector.remove();
        };
        
        selector.appendChild(option);
    });
    
    // Bouton annuler
    const cancelBtn = document.createElement('div');
    cancelBtn.textContent = '✕';
    cancelBtn.style.position = 'absolute';
    cancelBtn.style.top = '-10px';
    cancelBtn.style.right = '-10px';
    cancelBtn.style.width = '24px';
    cancelBtn.style.height = '24px';
    cancelBtn.style.borderRadius = '50%';
    cancelBtn.style.background = '#e74c3c';
    cancelBtn.style.color = 'white';
    cancelBtn.style.display = 'flex';
    cancelBtn.style.alignItems = 'center';
    cancelBtn.style.justifyContent = 'center';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.fontSize = '16px';
    cancelBtn.style.fontWeight = 'bold';
    
    cancelBtn.onclick = () => {
        selector.remove();
    };
    
    selector.appendChild(cancelBtn);
    document.body.appendChild(selector);
}

/**
 * Placer un meeple
 */
function placerMeeple(x, y, position, meepleType) {
    const key = `${x},${y},${position}`;
    const playerColor = getPlayerColor();
    
    console.log('🎭 Placement meeple:', meepleType, 'à', x, y, 'position', position);
    
    // Sauvegarder
    placedMeeples[key] = {
        type: meepleType,
        color: playerColor,
        playerId: multiplayer.playerId
    };
    
    // Afficher le meeple
    afficherMeeple(x, y, position, meepleType, playerColor);
    
    // Synchroniser
    if (gameSync) {
        gameSync.syncMeeplePlacement(x, y, position, meepleType, playerColor);
    }
    
    // Retirer le curseur
    document.querySelectorAll('.meeple-cursor').forEach(c => {
        const cursorX = parseInt(c.style.gridColumn);
        const cursorY = parseInt(c.style.gridRow);
        if (cursorX === x && cursorY === y) {
            c.remove();
        }
    });
    
    // Réafficher les curseurs pour permettre de placer d'autres meeples
    afficherCurseursMeeple(x, y);
}

/**
 * Afficher un meeple sur le plateau
 */
function afficherMeeple(x, y, position, meepleType, color) {
    const meeple = document.createElement('img');
    meeple.src = `./assets/Meeples/${color}/${meepleType}.png`;
    meeple.className = 'meeple';
    meeple.style.gridColumn = x;
    meeple.style.gridRow = y;
    
    // Calculer la position dans la grille 5x5
    const row = Math.floor((position - 1) / 5);
    const col = (position - 1) % 5;
    
    const offsetX = col * 41.6 + 20.8 - 15; // Centré (30px / 2)
    const offsetY = row * 41.6 + 20.8 - 15;
    
    meeple.style.position = 'absolute';
    meeple.style.left = `${offsetX}px`;
    meeple.style.top = `${offsetY}px`;
    meeple.style.width = '30px';
    meeple.style.height = '30px';
    meeple.style.zIndex = '50';
    meeple.style.pointerEvents = 'none';
    
    document.getElementById('board').appendChild(meeple);
}

/**
 * Récupérer la couleur du joueur actuel
 */
function getPlayerColor() {
    if (!gameState || !multiplayer) return 'Blue';
    const player = gameState.players.find(p => p.id === multiplayer.playerId);
    return player ? player.color.charAt(0).toUpperCase() + player.color.slice(1) : 'Blue';
}

// ==========

function setupNavigation(container, board) {
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoomLevel += e.deltaY > 0 ? -0.1 : 0.1;
        zoomLevel = Math.max(0.2, Math.min(3, zoomLevel));
        board.style.transform = `scale(${zoomLevel})`;
    }, { passive: false });

    container.addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('tile') || e.target.classList.contains('slot')) {
            return;
        }
        isDragging = true;
        container.style.cursor = 'grabbing';
        startX = e.pageX - container.offsetLeft;
        startY = e.pageY - container.offsetTop;
        scrollLeft = container.scrollLeft;
        scrollTop = container.scrollTop;
    });

    container.addEventListener('mouseleave', () => {
        isDragging = false;
        container.style.cursor = 'grab';
    });

    container.addEventListener('mouseup', () => {
        isDragging = false;
        container.style.cursor = 'grab';
    });

    container.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - container.offsetLeft;
        const y = e.pageY - container.offsetTop;
        const walkX = (x - startX) * 2;
        const walkY = (y - startY) * 2;
        container.scrollLeft = scrollLeft - walkX;
        container.scrollTop = scrollTop - walkY;
    });

    container.scrollLeft = 10400 - (container.clientWidth / 2);
    container.scrollTop = 10400 - (container.clientHeight / 2);
}

updateColorPickerVisibility();
console.log('Page chargée');
