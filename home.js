import { Multiplayer } from './modules/Multiplayer.js';
import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';
import { Deck } from './modules/Deck.js';
import { GameState } from './modules/GameState.js';
import { GameSync } from './modules/GameSync.js';
import { ZoneMerger } from './modules/ZoneMerger.js';
import { Scoring } from './modules/Scoring.js';

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
let zoneMerger = null;
let scoring = null;
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
    
    // ✅ Initialiser ZoneMerger et Scoring
    zoneMerger = new ZoneMerger(plateau);
    scoring = new Scoring(zoneMerger);
    console.log('🔗 ZoneMerger et Scoring initialisés');
    
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
    
    gameSync.onScoreUpdate = (scoringResults, meeplesToReturn) => {
        console.log('💰 [SYNC] Mise à jour des scores reçue');
        
        // Appliquer les scores
        scoringResults.forEach(({ playerId, points, reason }) => {
            const player = gameState.players.find(p => p.id === playerId);
            if (player) {
                player.score += points;
                console.log(`  ${player.name} +${points} pts (${reason})`);
            }
        });
        
        // Retirer les meeples
        meeplesToReturn.forEach(key => {
            const meeple = placedMeeples[key];
            if (meeple) {
                // ✅ Incrémenter le nombre de meeples disponibles
                incrementPlayerMeeples(meeple.playerId);
            }
            document.querySelectorAll(`.meeple[data-key="${key}"]`).forEach(el => el.remove());
            delete placedMeeples[key];
        });
        
        // Mettre à jour l'affichage
        updateTurnDisplay();
    };
    
    // Setup de l'interface
    console.log('🔧 Setup des event listeners...');
    setupEventListeners();
    console.log('🔧 Setup de la navigation...');
    setupNavigation(document.getElementById('board-container'), document.getElementById('board'));
    
    // Si on est l'hôte, charger et envoyer la pioche
    if (isHost) {
        console.log('👑 [HÔTE] Chargement de la pioche...');
        await deck.loadAllTiles(document.getElementById('use-test-deck')?.checked || false);
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
    
    // ✅ Initialiser ZoneMerger et Scoring
    zoneMerger = new ZoneMerger(plateau);
    scoring = new Scoring(zoneMerger);
    
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
    
    gameSync.onScoreUpdate = (scoringResults, meeplesToReturn) => {
        console.log('💰 [SYNC] Mise à jour des scores reçue');
        
        scoringResults.forEach(({ playerId, points, reason }) => {
            const player = gameState.players.find(p => p.id === playerId);
            if (player) {
                player.score += points;
                console.log(`  ${player.name} +${points} pts (${reason})`);
            }
        });
        
        meeplesToReturn.forEach(key => {
            const meeple = placedMeeples[key];
            if (meeple) {
                // ✅ Incrémenter le nombre de meeples disponibles
                incrementPlayerMeeples(meeple.playerId);
            }
            document.querySelectorAll(`.meeple[data-key="${key}"]`).forEach(el => el.remove());
            delete placedMeeples[key];
        });
        
        updateTurnDisplay();
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
                <span style="flex: 1; color: ${isActive ? '#2ecc71' : '#ecf0f1'}; font-weight: ${isActive ? 'bold' : 'normal'};">${player.name} (${player.score || 0} pts)</span>
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
    
    // ✅ Mettre à jour le tableau de scores
    updateScorePanel();

        
        // ✅ Changer le texte si le deck est vide
        if (deck.currentIndex >= deck.totalTiles) {
            endTurnBtn.textContent = 'Calculer le score final';
            endTurnBtn.classList.add('final-score-btn');
        } else {
            endTurnBtn.textContent = 'Terminer mon tour';
            endTurnBtn.classList.remove('final-score-btn');
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
        
        // ✅ Calculer les scores des zones fermées
        if (scoring && zoneMerger) {
            const { scoringResults, meeplesToReturn } = scoring.scoreClosedZones(placedMeeples);
            
            if (scoringResults.length > 0) {
                console.log('💰 Scores calculés:', scoringResults);
                
                // Appliquer les scores localement
                scoringResults.forEach(({ playerId, points, reason }) => {
                    const player = gameState.players.find(p => p.id === playerId);
                    if (player) {
                        player.score += points;
                        console.log(`  ${player.name} +${points} pts (${reason})`);
                    }
                });
                
                // Retirer les meeples des zones fermées
                meeplesToReturn.forEach(key => {
                    const meeple = placedMeeples[key];
                    if (meeple) {
                        console.log(`  Retour meeple de ${meeple.playerId} à ${key}`);
                        // ✅ Incrémenter le nombre de meeples disponibles
                        incrementPlayerMeeples(meeple.playerId);

                        
                        // ✅ Retirer visuellement - chercher tous les meeples et vérifier data-key
                        const [x, y, position] = key.split(',');
                        document.querySelectorAll('.meeple').forEach(el => {
                            if (el.dataset.key === key) {
                                console.log('    Meeple visuel retiré');
                                el.remove();
                            }
                        });
                        
                        // Retirer des données
                        delete placedMeeples[key];
                    }
                });
                
                // Synchroniser les scores
                if (gameSync) {
                    gameSync.syncScoreUpdate(scoringResults, meeplesToReturn);
                }
                
                // Mettre à jour l'affichage
                updateTurnDisplay();
            }
        }
        
        // ✅ Nettoyer les curseurs de meeple
        document.querySelectorAll('.meeple-cursors-container').forEach(c => c.remove());
        lastPlacedTile = null;
        
        if (gameSync) {
            // Synchroniser la fin de tour (qui met à jour gameState.currentPlayerIndex)
            gameSync.syncTurnEnd();
            
            // ✅ 6) IMPORTANT : Mettre à jour isMyTurn localement APRÈS avoir changé de tour
            const currentPlayer = gameState.getCurrentPlayer();
            isMyTurn = currentPlayer.id === multiplayer.playerId;
            console.log('🔄 Mise à jour isMyTurn:', isMyTurn, 'Tour de:', currentPlayer.name);
        }
        
        // ✅ Vérifier si c'est la fin de partie (deck vide)
        if (deck.currentIndex >= deck.totalTiles) {
            console.log('🏁 FIN DE PARTIE - Calcul des scores finaux');
            
            if (scoring && zoneMerger) {
                const finalScores = scoring.calculateFinalScores(placedMeeples, gameState);
                
                console.log('💰 Scores finaux:', finalScores);
                
                // Appliquer les scores finaux
                finalScores.forEach(({ playerId, points, reason }) => {
                    const player = gameState.players.find(p => p.id === playerId);
                    if (player) {
                        player.score += points;
                        console.log(`  ${player.name} +${points} pts (${reason})`);
                    }
                });
                
                // Mettre à jour l'affichage
                updateTurnDisplay();
                
                // Afficher le gagnant
                const winner = gameState.players.reduce((a, b) => a.score > b.score ? a : b);
                setTimeout(() => {
                    alert(`🏆 Partie terminée !
${winner.name} gagne avec ${winner.score} points !

Scores finaux :
${gameState.players.map(p => `${p.name}: ${p.score} pts`).join('\n')}`);
                }, 500);
            }
            
            return; // Ne pas piocher de nouvelle tuile
        }
        
        // Piocher la nouvelle tuile localement
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

    mettreAJourCompteur();
    
    if (gameState) {
        updateTurnDisplay();
    }
    
    // ✅ 5) Rafraîchir les slots APRÈS updateTurnDisplay pour que isMyTurn soit à jour
    if (firstTilePlaced) {
        rafraichirTousLesSlots();
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
        
        document.getElementById('tile-preview').innerHTML = '<img src="./assets/verso.png" style="width: 120px; border: 2px solid #666;">';
        
        if (gameSync) {
            gameSync.syncTilePlacement(x, y, tile);
        }
        
        lastPlacedTile = {x, y};
        
        // ✅ Garder tuileEnMain temporairement pour rafraîchir les slots
        const tempTile = tuileEnMain;
        tuileEnMain = null;
        rafraichirTousLesSlots();
        tuileEnMain = tempTile;
        
        // ✅ Merger les zones après placement
        if (zoneMerger) {
            zoneMerger.updateZonesForNewTile(x, y);
        }
        
        if (isMyTurn && gameSync) {
            afficherCurseursMeeple(x, y);
        }
        
        tuileEnMain = null;
    } else {
        tuilePosee = true;
        document.querySelectorAll('.slot').forEach(s => s.remove());
        
        document.getElementById('tile-preview').innerHTML = '<img src="./assets/verso.png" style="width: 120px; border: 2px solid #666;">';
        
        if (gameSync) {
            gameSync.syncTilePlacement(x, y, tile);
        }
        
        lastPlacedTile = {x, y};
        
        // ✅ Sauvegarder tuileEnMain avant de mettre à null
        const savedTile = tuileEnMain;
        tuileEnMain = null;
        
        // ✅ Merger les zones après placement
        if (zoneMerger) {
            zoneMerger.updateZonesForNewTile(x, y);
        }
        
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
    
    // ✅ Merger les zones pour les tuiles synchronisées
    if (zoneMerger) {
        zoneMerger.updateZonesForNewTile(x, y);
    }

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
 * Calculer la position après rotation (grille 5x5)
 * @param {number} position - Position originale (1-25)
 * @param {number} rotation - Rotation en degrés (0, 90, 180, 270)
 * @returns {number} Position après rotation
 */
function rotatePosition(position, rotation) {
    if (rotation === 0) return position;
    
    // Convertir position en coordonnées (row, col)
    const row = Math.floor((position - 1) / 5);
    const col = (position - 1) % 5;
    
    let newRow = row;
    let newCol = col;
    
    // Appliquer les rotations successives
    const rotations = rotation / 90;
    for (let i = 0; i < rotations; i++) {
        const tempRow = newRow;
        newRow = newCol;
        newCol = 4 - tempRow;
    }
    
    // Reconvertir en position (1-25)
    return (newRow * 5) + newCol + 1;
}

/**
 * Récupérer les positions de meeple valides pour une tuile avec rotation
 */
function getValidMeeplePositions(x, y) {
    const tile = plateau.placedTiles[`${x},${y}`];
    if (!tile) {
        console.log('❌ Tuile non trouvée à', x, y);
        return [];
    }
    
    console.log('🔍 Tuile trouvée:', tile.id, 'rotation:', tile.rotation);
    console.log('📦 Zones de la tuile:', tile.zones);
    
    if (!tile.zones || tile.zones.length === 0) {
        console.log('❌ Pas de zones sur cette tuile');
        return [];
    }
    
    const validPositions = [];
    
    // Pour chaque zone, récupérer ses positions et les faire tourner
    tile.zones.forEach((zone, index) => {
        console.log(`  Zone ${index}:`, zone.type, 'meeplePosition:', zone.meeplePosition);
        
        if (zone.meeplePosition !== undefined && zone.meeplePosition !== null) {
            // ✅ Gérer à la fois nombre et array
            const positions = Array.isArray(zone.meeplePosition) 
                ? zone.meeplePosition 
                : [zone.meeplePosition];
            
            positions.forEach(pos => {
                const rotatedPos = rotatePosition(pos, tile.rotation);
                console.log(`    Position ${pos} → ${rotatedPos} (rotation ${tile.rotation}°)`);
                validPositions.push({
                    position: rotatedPos,
                    zoneType: zone.type
                });
            });
        }
    });
    
    console.log('✅ Total positions valides:', validPositions.length);
    return validPositions;
}

/**
 * Afficher les curseurs de placement de meeple sur une tuile
 */
function afficherCurseursMeeple(x, y) {
    console.log('🎯 Affichage des curseurs de meeple sur', x, y);
    
    // Nettoyer les anciens curseurs et conteneurs
    document.querySelectorAll('.meeple-cursors-container').forEach(c => c.remove());
    
    // ✅ Récupérer les positions valides depuis les zones de la tuile
    const validPositions = getValidMeeplePositions(x, y);
    if (validPositions.length === 0) {
        console.log('⚠️ Aucune position de meeple valide sur cette tuile');
        return;
    }
    
    console.log('✅ Positions valides:', validPositions);
    
    // Créer un conteneur pour les curseurs sur cette tuile
    const container = document.createElement('div');
    container.className = 'meeple-cursors-container';
    container.style.gridColumn = x;
    container.style.gridRow = y;
    container.style.position = 'relative';
    container.style.width = '208px';
    container.style.height = '208px';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '100';
    
    // Créer un curseur pour chaque position valide
    validPositions.forEach(({position, zoneType}) => {
        const key = `${x},${y},${position}`;
        
        // Vérifier si la position est déjà occupée
        if (placedMeeples[key]) {
            console.log('⏭️ Position', position, 'déjà occupée, pas de curseur');
            return;
        }
        
        // ✅ Vérifier si la zone mergée contient déjà un meeple
        if (zoneMerger) {
            const mergedZone = zoneMerger.findMergedZoneForPosition(x, y, position);
            if (mergedZone) {
                const meeplesInZone = zoneMerger.getZoneMeeples(mergedZone, placedMeeples);
                if (meeplesInZone.length > 0) {
                    console.log('⏭️ Position', position, 'dans une zone avec meeple(s), pas de curseur');
                    return;
                }
            }
        }
        
        const cursor = document.createElement('div');
        cursor.className = 'meeple-cursor';
        cursor.dataset.zoneType = zoneType; // ✅ Stocker le type de zone
        
        // Calculer la position dans la grille 5x5
        const row = Math.floor((position - 1) / 5);
        const col = (position - 1) % 5;
        
        const offsetX = 20.8 + (col * 41.6);
        const offsetY = 20.8 + (row * 41.6);
        
        cursor.style.position = 'absolute';
        cursor.style.left = `${offsetX}px`;
        cursor.style.top = `${offsetY}px`;
        cursor.style.width = '12px';
        cursor.style.height = '12px';
        cursor.style.borderRadius = '50%';
        cursor.style.backgroundColor = 'rgba(255, 215, 0, 0.6)';
        cursor.style.border = '2px solid gold';
        cursor.style.cursor = 'pointer';
        cursor.style.pointerEvents = 'auto';
        cursor.style.transition = 'all 0.2s';
        cursor.style.transform = 'translate(-50%, -50%)';
        
        cursor.onmouseenter = () => {
            cursor.style.backgroundColor = 'rgba(255, 215, 0, 1)';
            cursor.style.transform = 'translate(-50%, -50%) scale(1.3)';
        };
        
        cursor.onmouseleave = () => {
            cursor.style.backgroundColor = 'rgba(255, 215, 0, 0.6)';
            cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        };
        
        cursor.onclick = (e) => {
            e.stopPropagation();
            afficherSelecteurMeeple(x, y, position, zoneType, e.clientX, e.clientY);
        };
        
        container.appendChild(cursor);
    });
    
    document.getElementById('board').appendChild(container);
}

/**
 * Afficher le sélecteur de type de meeple (menu compact)
 */
function afficherSelecteurMeeple(x, y, position, zoneType, mouseX, mouseY) {
    console.log('📋 Sélecteur de meeple à la position', position, 'type:', zoneType);
    
    // Nettoyer l'ancien sélecteur
    const oldSelector = document.getElementById('meeple-selector');
    if (oldSelector) oldSelector.remove();
    
    // Créer le sélecteur
    const selector = document.createElement('div');
    selector.id = 'meeple-selector';
    selector.style.position = 'fixed';
    selector.style.left = `${mouseX}px`;
    selector.style.top = `${mouseY - 80}px`;
    selector.style.transform = 'translateX(-50%)';
    selector.style.zIndex = '1000';
    selector.style.display = 'flex';
    selector.style.gap = '0px';
    selector.style.padding = '2px';
    selector.style.background = 'rgba(44, 62, 80, 0.5)';
    selector.style.borderRadius = '8px';
    selector.style.border = '2px solid gold';
    selector.style.boxShadow = '0 4px 20px rgba(0,0,0,0.5)';
    
    // ✅ Proposer les meeples selon le type de zone
    let meepleTypes = [];
    
    if (zoneType === 'field') {
        // Field → Farmer uniquement
        meepleTypes = [
            { type: 'Farmer', image: `./assets/Meeples/${getPlayerColor()}/Farmer.png` }
        ];
    } else if (zoneType === 'road' || zoneType === 'city') {
        // Road ou City → Normal uniquement
        meepleTypes = [
            { type: 'Normal', image: `./assets/Meeples/${getPlayerColor()}/Normal.png` }
        ];
    } else {
        // Par défaut (abbey, etc.) → Normal
        meepleTypes = [
            { type: 'Normal', image: `./assets/Meeples/${getPlayerColor()}/Normal.png` }
        ];
    }
    
    meepleTypes.forEach(meeple => {
        const option = document.createElement('div');
        option.style.cursor = 'pointer';
        option.style.padding = '2px';
        option.style.borderRadius = '5px';
        option.style.transition = 'background 0.2s';
        
        const img = document.createElement('img');
        img.src = meeple.image;
        img.style.width = '30px';
        img.style.height = '30px';
        img.style.display = 'block';
        
        option.appendChild(img);
        
        option.onmouseenter = () => {
            option.style.background = 'rgba(255, 215, 0, 0.2)';
        };
        
        option.onmouseleave = () => {
            option.style.background = 'transparent';
        };
        
        option.onclick = (e) => {
            e.stopPropagation();
            placerMeeple(x, y, position, meeple.type);
            setTimeout(() => selector.remove(), 0);
        };
        
        selector.appendChild(option);
    });
    
    // Fermer quand on clique ailleurs
    setTimeout(() => {
        const closeOnClickOutside = (e) => {
            if (!selector.contains(e.target)) {
                selector.remove();
                document.removeEventListener('click', closeOnClickOutside);
            }
        };
        document.addEventListener('click', closeOnClickOutside);
    }, 10);
    
    document.body.appendChild(selector);
}

/**
 * Placer un meeple
 */
function placerMeeple(x, y, position, meepleType) {
    const key = `${x},${y},${position}`;
    // ✅ Vérifier si le joueur a des meeples disponibles
    if (!hasAvailableMeeples(multiplayer.playerId)) {
        alert('❌ Vous n'avez plus de meeples disponibles !');
        document.querySelectorAll('.meeple-cursors-container').forEach(c => c.remove());
        return;
    }

    const playerColor = getPlayerColor();
    
    console.log('🎭 Placement meeple:', meepleType, 'à', x, y, 'position', position);
    
    // Sauvegarder
    placedMeeples[key] = {
        type: meepleType,
        color: playerColor,
        playerId: multiplayer.playerId
    };
    
    
    // ✅ Décrémenter le nombre de meeples disponibles
    decrementPlayerMeeples(multiplayer.playerId);

    // Afficher le meeple
    afficherMeeple(x, y, position, meepleType, playerColor);
    
    // Synchroniser
    if (gameSync) {
        gameSync.syncMeeplePlacement(x, y, position, meepleType, playerColor);
    }
    
    // ✅ Faire disparaître TOUS les curseurs (un seul meeple par tour)
    document.querySelectorAll('.meeple-cursors-container').forEach(c => c.remove());
}

/**
 * Afficher un meeple sur le plateau
 */
function afficherMeeple(x, y, position, meepleType, color) {
    // ✅ 1) Créer un conteneur sur la tuile, pas directement le meeple
    let container = document.querySelector(`.meeple-container[data-pos="${x},${y}"]`);
    if (!container) {
        container = document.createElement('div');
        container.className = 'meeple-container';
        container.dataset.pos = `${x},${y}`;
        container.style.gridColumn = x;
        container.style.gridRow = y;
        container.style.position = 'relative';
        container.style.width = '208px';
        container.style.height = '208px';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '50';
        document.getElementById('board').appendChild(container);
    }
    
    const meeple = document.createElement('img');
    meeple.src = `./assets/Meeples/${color}/${meepleType}.png`;
    meeple.className = 'meeple';
    meeple.dataset.key = `${x},${y},${position}`; // ✅ Pour pouvoir retirer le meeple
    meeple.dataset.position = position;
    
    // Calculer la position dans la grille 5x5
    const row = Math.floor((position - 1) / 5);
    const col = (position - 1) % 5;
    
    const offsetX = 20.8 + (col * 41.6);
    const offsetY = 20.8 + (row * 41.6);
    
    meeple.style.position = 'absolute';
    meeple.style.left = `${offsetX}px`;
    meeple.style.top = `${offsetY}px`;
    meeple.style.width = '60px'; // ✅ Doublé de 30px à 60px
    meeple.style.height = '60px';
    meeple.style.transform = 'translate(-50%, -50%)';
    meeple.style.pointerEvents = 'none';
    
    container.appendChild(meeple);
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

// ========================================
// GESTION DU TABLEAU DE SCORES
// ========================================

/**
 * Mettre à jour l'affichage du tableau de scores
 */
function updateScorePanel() {
    const playersScoresDiv = document.getElementById('players-scores');
    if (!playersScoresDiv || !gameState) return;
    
    playersScoresDiv.innerHTML = '';
    
    const currentPlayer = gameState.getCurrentPlayer();
    
    gameState.players.forEach(player => {
        const isCurrentPlayer = currentPlayer && player.id === currentPlayer.id;
        
        const card = document.createElement('div');
        card.className = 'player-score-card';
        if (isCurrentPlayer) {
            card.classList.add('active');
        }
        
        // Header avec nom et score
        const header = document.createElement('div');
        header.className = 'player-score-header';
        
        if (isCurrentPlayer) {
            const indicator = document.createElement('span');
            indicator.className = 'turn-indicator';
            indicator.textContent = '▶';
            header.appendChild(indicator);
        }
        
        const name = document.createElement('span');
        name.className = 'player-score-name';
        name.textContent = player.name;
        header.appendChild(name);
        
        const points = document.createElement('span');
        points.className = 'player-score-points';
        points.textContent = `${player.score} point${player.score > 1 ? 's' : ''}`;
        header.appendChild(points);
        
        card.appendChild(header);
        
        // Affichage des meeples disponibles
        const meeplesDisplay = document.createElement('div');
        meeplesDisplay.className = 'player-meeples-display';
        
        const colorCapitalized = player.color.charAt(0).toUpperCase() + player.color.slice(1);
        
        for (let i = 0; i < 7; i++) {
            const meeple = document.createElement('img');
            meeple.src = `./assets/Meeples/${colorCapitalized}/Normal.png`;
            meeple.alt = 'Meeple';
            
            if (i >= player.meeples) {
                meeple.classList.add('unavailable');
            }
            
            meeplesDisplay.appendChild(meeple);
        }
        
        card.appendChild(meeplesDisplay);
        playersScoresDiv.appendChild(card);
    });
}

/**
 * Décrémenter le nombre de meeples d'un joueur
 */
function decrementPlayerMeeples(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (player && player.meeples > 0) {
        player.meeples--;
        console.log(`🎭 ${player.name} a maintenant ${player.meeples} meeples disponibles`);
        updateScorePanel();
        
        // Synchroniser
        if (gameSync) {
            gameSync.multiplayer.broadcast({
                type: 'meeple-count-update',
                playerId: playerId,
                meeples: player.meeples
            });
        }
    }
}

/**
 * Incrémenter le nombre de meeples d'un joueur
 */
function incrementPlayerMeeples(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    if (player && player.meeples < 7) {
        player.meeples++;
        console.log(`🎭 ${player.name} récupère un meeple (${player.meeples}/7)`);
        updateScorePanel();
        
        // Synchroniser
        if (gameSync) {
            gameSync.multiplayer.broadcast({
                type: 'meeple-count-update',
                playerId: playerId,
                meeples: player.meeples
            });
        }
    }
}

/**
 * Vérifier si le joueur a des meeples disponibles
 */
function hasAvailableMeeples(playerId) {
    const player = gameState.players.find(p => p.id === playerId);
    return player && player.meeples > 0;
}

// ========================================
// ÉVÉNEMENTS DES NOUVEAUX BOUTONS
// ========================================

// Bouton "Annuler le coup !" (à implémenter plus tard)
document.getElementById('undo-btn').addEventListener('click', () => {
    console.log('⏮️ Annulation du coup (fonctionnalité à implémenter)');
    alert('Fonctionnalité à venir : Annuler le dernier coup joué');
});

// Bouton "Tuiles restantes dans la pioche ?"
document.getElementById('remaining-tiles-btn').addEventListener('click', () => {
    if (!deck) {
        alert('Aucune partie en cours');
        return;
    }
    
    const remaining = deck.remaining();
    const total = deck.total();
    alert(`🎴 Tuiles restantes : ${remaining} / ${total}`);
});

// Bouton "Règles de cette partie ?"
document.getElementById('rules-btn').addEventListener('click', () => {
    console.log('📜 Affichage des règles (fonctionnalité à implémenter)');
    alert('Fonctionnalité à venir : Afficher les règles actives pour cette partie');
});
