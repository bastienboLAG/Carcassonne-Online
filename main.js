import { Tile } from './modules/Tile.js';
import { Board } from './modules/Board.js';
import { Deck } from './modules/Deck.js';
import { Multiplayer } from './modules/Multiplayer.js';
import { GameState } from './modules/GameState.js';
import { GameSync } from './modules/GameSync.js';
import Peer from 'https://esm.sh/peerjs@1.5.2';

// ========== VARIABLES GLOBALES ==========
const plateau = new Board();
const deck = new Deck();
let tuileEnMain = null;
let tuilePosee = false;
let zoomLevel = 1;
let firstTilePlaced = false;

let isDragging = false;
let startX = 0;
let startY = 0;
let scrollLeft = 0;
let scrollTop = 0;

// ========== MULTIJOUEUR ==========
let multiplayer = null;
let gameState = null;
let gameSync = null;
let sessionData = null;
let isMyTurn = false;

// ========== INITIALISATION ==========
async function init() {
    try {
        console.log('🎮 Initialisation du jeu...');
        
        // Récupérer la session du lobby
        const sessionJson = localStorage.getItem('carcassonne-session');
        if (sessionJson) {
            sessionData = JSON.parse(sessionJson);
            console.log('💾 Session récupérée:', sessionData);
            
            // Reconnecter le multiplayer
            await initMultiplayer();
        } else {
            console.log('⚠️ Pas de session multijoueur, mode solo');
        }
        
        // Initialiser le GameState
        gameState = new GameState();
        if (sessionData) {
            // Ajouter tous les joueurs du lobby
            sessionData.players.forEach(player => {
                gameState.addPlayer(player.id, player.name, player.color);
            });
            console.log('👥 Joueurs ajoutés au GameState:', gameState.players);
        }
        
        // Créer le slot central
        creerSlotCentral();
        console.log('🎯 Slot central créé');
        
        // Setup de l'interface
        setupEventListeners();
        setupNavigation(document.getElementById('board-container'), document.getElementById('board'));
        
        // Si on est l'hôte, charger et envoyer la pioche
        if (sessionData && sessionData.multiplayer.isHost) {
            console.log('👑 [HÔTE] Chargement de la pioche...');
            await deck.loadAllTiles();
            console.log('📦 Deck chargé par l\'hôte');
            
            // Envoyer la pioche à tous les joueurs
            gameSync.startGame(deck);
            
            // Piocher la première tuile
            piocherNouvelleTuile();
            mettreAJourCompteur();
            
            // C'est le tour du premier joueur (l'hôte en général)
            updateTurnDisplay();
        } else if (sessionData && !sessionData.multiplayer.isHost) {
            console.log('👤 [INVITÉ] En attente de la pioche...');
            afficherMessage('En attente de l\'hôte...');
        } else {
            // Mode solo
            await deck.loadAllTiles();
            piocherNouvelleTuile();
            mettreAJourCompteur();
        }
        
        console.log('✅ Initialisation terminée');
    } catch (e) {
        console.error('❌ Erreur init:', e);
    }
}

// ========== MULTIJOUEUR ==========
async function initMultiplayer() {
    multiplayer = new Multiplayer();
    
    // Recréer le peer avec le même ID
    return new Promise((resolve, reject) => {
        multiplayer.peer = new Peer(sessionData.multiplayer.peerId);
        multiplayer.playerId = sessionData.multiplayer.peerId;
        multiplayer.isHost = sessionData.multiplayer.isHost;
        
        multiplayer.peer.on('open', (id) => {
            console.log('🔌 Peer reconnecté:', id);
            
            if (multiplayer.isHost) {
                // L'hôte écoute les connexions
                multiplayer.peer.on('connection', (conn) => {
                    multiplayer._handleConnection(conn);
                });
            } else {
                // L'invité se reconnecte à l'hôte
                const hostId = sessionData.players.find(p => p.isHost).id;
                console.log('🔌 Reconnexion à l\'hôte:', hostId);
                const conn = multiplayer.peer.connect(hostId);
                multiplayer._handleConnection(conn);
            }
            
            // Initialiser GameSync
            gameSync = new GameSync(multiplayer, gameState);
            gameSync.init();
            
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
                
                // Créer une tuile avec les données reçues
                const tileData = deck.tiles.find(t => t.id === tileId);
                if (tileData) {
                    const tile = new Tile(tileData);
                    tile.rotation = rotation;
                    poserTuileSync(x, y, tile);
                }
            };
            
            gameSync.onTurnEnded = (nextPlayerIndex, gameStateData) => {
                console.log('⏭️ [SYNC] Fin de tour reçue');
                
                // Restaurer le GameState
                gameState.deserialize(gameStateData);
                
                // Piocher une nouvelle tuile
                piocherNouvelleTuile();
                updateTurnDisplay();
            };
            
            resolve();
        });
        
        multiplayer.peer.on('error', (err) => {
            console.error('❌ Erreur peer:', err);
            reject(err);
        });
    });
}

function updateTurnDisplay() {
    if (!gameState || gameState.players.length === 0) {
        isMyTurn = true; // Mode solo
        return;
    }
    
    const currentPlayer = gameState.getCurrentPlayer();
    isMyTurn = currentPlayer.id === multiplayer.playerId;
    
    const turnInfo = document.getElementById('turn-info');
    if (!turnInfo) {
        const infoDiv = document.createElement('div');
        infoDiv.id = 'turn-info';
        infoDiv.style.cssText = 'padding: 15px; background: rgba(0,0,0,0.5); border-radius: 5px; text-align: center; margin: 10px 0;';
        document.getElementById('game-ui').insertBefore(infoDiv, document.getElementById('current-tile-container'));
    }
    
    const colorImages = {
        'black': './assets/Meeples/Black/Normal.png',
        'red': './assets/Meeples/Red/Normal.png',
        'pink': './assets/Meeples/Pink/Normal.png',
        'green': './assets/Meeples/Green/Normal.png',
        'blue': './assets/Meeples/Blue/Normal.png',
        'yellow': './assets/Meeples/Yellow/Normal.png'
    };
    
    const meepleImg = colorImages[currentPlayer.color];
    
    if (isMyTurn) {
        document.getElementById('turn-info').innerHTML = `
            <div style="color: #2ecc71; font-weight: bold; font-size: 18px;">
                <img src="${meepleImg}" style="width: 30px; height: 30px; vertical-align: middle;"> 
                C'est votre tour !
            </div>
        `;
    } else {
        document.getElementById('turn-info').innerHTML = `
            <div style="color: #ecf0f1; font-size: 16px;">
                <img src="${meepleImg}" style="width: 30px; height: 30px; vertical-align: middle;"> 
                Tour de ${currentPlayer.name}
            </div>
        `;
    }
}

function afficherMessage(msg) {
    const preview = document.getElementById('tile-preview');
    preview.innerHTML = `<p style="text-align: center; color: white;">${msg}</p>`;
}

// ========== SETUP ÉVÉNEMENTS ==========
function setupEventListeners() {
    // Rotation de la tuile
    document.getElementById('tile-preview').addEventListener('click', () => {
        if (!isMyTurn && sessionData) {
            console.log('⚠️ Pas votre tour !');
            return;
        }
        
        if (tuileEnMain && !tuilePosee) {
            const currentImg = document.getElementById('current-tile-img');
            
            // Toujours incrémenter
            tuileEnMain.rotation = (tuileEnMain.rotation + 90) % 360;
            
            // Appliquer la rotation en incrémentant
            const currentTransform = currentImg.style.transform;
            const currentDeg = parseInt(currentTransform.match(/rotate\((\d+)deg\)/)?.[1] || '0');
            const newDeg = currentDeg + 90;
            
            currentImg.style.transform = `rotate(${newDeg}deg)`;
            
            // Synchroniser la rotation
            if (gameSync) {
                gameSync.syncTileRotation(tuileEnMain.rotation);
            }
            
            if (firstTilePlaced) {
                rafraichirTousLesSlots();
            }
        }
    });
    
    // Fin de tour
    document.getElementById('end-turn-btn').onclick = () => {
        if (!isMyTurn && sessionData) {
            alert('Ce n\'est pas votre tour !');
            return;
        }
        
        if (!tuilePosee) {
            alert('Vous devez poser la tuile avant de terminer votre tour !');
            return;
        }
        
        // Synchroniser la fin de tour
        if (gameSync) {
            gameSync.syncTurnEnd();
        } else {
            // Mode solo
            piocherNouvelleTuile();
        }
    };
    
    // Recentrer
    document.getElementById('recenter-btn').onclick = () => {
        const container = document.getElementById('board-container');
        container.scrollLeft = 10400 - (container.clientWidth / 2);
        container.scrollTop = 10400 - (container.clientHeight / 2);
    };
}

// ========== SLOT CENTRAL ==========
function creerSlotCentral() {
    const slot = document.createElement('div');
    slot.className = "slot slot-central";
    slot.style.gridColumn = 50;
    slot.style.gridRow = 50;
    slot.onclick = () => {
        if (!isMyTurn && sessionData) {
            console.log('⚠️ Pas votre tour !');
            return;
        }
        
        if (tuileEnMain && !firstTilePlaced) {
            poserTuile(50, 50, tuileEnMain, true);
        }
    };
    document.getElementById('board').appendChild(slot);
}

// ========== PIOCHE ==========
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

    const previewContainer = document.getElementById('tile-preview');
    previewContainer.innerHTML = `<img id="current-tile-img" src="${tuileEnMain.imagePath}" style="cursor: pointer; transform: rotate(0deg);" title="Cliquez pour tourner">`;

    if (firstTilePlaced) {
        rafraichirTousLesSlots();
    }
    
    mettreAJourCompteur();
    
    if (sessionData) {
        updateTurnDisplay();
    }
}

// ========== PLACEMENT ==========
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
        
        // Synchroniser le placement
        if (gameSync) {
            gameSync.syncTilePlacement(x, y, tile);
        }
        
        tuileEnMain = null;
        rafraichirTousLesSlots();
    } else {
        tuilePosee = true;
        document.querySelectorAll('.slot').forEach(s => s.remove());
        document.getElementById('tile-preview').innerHTML = '<img src="./assets/verso.png" style="width: 120px; border: 2px solid #666;">';
        
        // Synchroniser le placement
        if (gameSync) {
            gameSync.syncTilePlacement(x, y, tile);
        }
        
        tuileEnMain = null;
    }
}

// Poser une tuile suite à une synchronisation (sans re-synchroniser)
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
        document.querySelectorAll('.slot').forEach(s => s.remove());
        if (tuileEnMain) {
            rafraichirTousLesSlots();
        }
    }
}

// ========== SLOTS ==========
function rafraichirTousLesSlots() {
    if (firstTilePlaced) {
        document.querySelectorAll('.slot:not(.slot-central)').forEach(s => s.remove());
    }
    
    if (!tuileEnMain) return;
    if (!isMyTurn && sessionData) return; // Ne pas afficher les slots si ce n'est pas notre tour
    
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
            slot.onclick = () => {
                if (!isMyTurn && sessionData) {
                    console.log('⚠️ Pas votre tour !');
                    return;
                }
                poserTuile(nx, ny, tuileEnMain);
            };
            document.getElementById('board').appendChild(slot);
        }
    });
}

// ========== COMPTEUR ==========
function mettreAJourCompteur() {
    const remaining = deck.remaining();
    const total = deck.total();
    console.log(`📊 Compteur: ${remaining} / ${total}`);
    document.getElementById('tile-counter').textContent = `Tuiles : ${remaining} / ${total}`;
}

// ========== NAVIGATION ==========
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

    // Centrage initial
    container.scrollLeft = 10400 - (container.clientWidth / 2);
    container.scrollTop = 10400 - (container.clientHeight / 2);
}

// ========== DÉMARRAGE ==========
init();
