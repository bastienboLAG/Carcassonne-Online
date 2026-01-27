/**
 * CARCASSONNE ONLINE - main.js
 * Gestion de la grille, de la rotation et de la validation des tuiles
 */

const board = document.getElementById('board');
const currentTileImg = document.getElementById('current-tile-img');
const rotateBtn = document.getElementById('rotate-btn');

let deck = [];
let currentTile = null;
let currentRotation = 0;
const placedTiles = {}; // Stockage : "x,y": { tile, rotation }

// --- CONFIGURATION DES ROTATIONS ET CORRESPONDANCES ---

// Comment les segments se déplacent lors d'une rotation de 90° horaire
const rotationMapping = {
    "north": "east", "east": "south", "south": "west", "west": "north",
    "north-left": "east-top", "east-top": "south-right", "south-right": "west-bottom", "west-bottom": "north-left",
    "north-right": "east-bottom", "east-bottom": "south-left", "south-left": "west-top", "west-top": "north-right"
};

// Quels segments doivent correspondre entre deux tuiles adjacentes
const opposites = {
    "north": "south", "south": "north", "east": "west", "west": "east",
    "north-left": "south-left", "south-left": "north-left",
    "north-right": "south-right", "south-right": "north-right",
    "east-top": "west-top", "west-top": "east-top",
    "east-bottom": "west-bottom", "west-bottom": "east-bottom"
};

/**
 * Calcule l'état des bords d'une tuile après une certaine rotation
 */
function getRotatedEdges(tile, rotation) {
    const numRotations = (rotation / 90) % 4;
    let currentEdges = { ...tile.edges };

    for (let i = 0; i < numRotations; i++) {
        let nextEdges = {};
        for (const [key, value] of Object.entries(currentEdges)) {
            const newKey = rotationMapping[key];
            if (newKey) nextEdges[newKey] = value;
        }
        currentEdges = nextEdges;
    }
    return currentEdges;
}

/**
 * Vérifie si une tuile peut être posée à une coordonnée précise
 */
function canPlaceTileAt(x, y, tile, rotation) {
    const myEdges = getRotatedEdges(tile, rotation);
    let hasNeighbor = false;

    // Définition des 4 directions de voisinage
    const checks = [
        { nx: x, ny: y - 1, side: 'north' }, // Voisin au Nord
        { nx: x, ny: y + 1, side: 'south' }, // Voisin au Sud
        { nx: x + 1, ny: y, side: 'east' },  // Voisin à l'Est
        { nx: x - 1, ny: y, side: 'west' }   // Voisin à l'Ouest
    ];

    for (const check of checks) {
        const neighborData = placedTiles[`${check.nx},${check.ny}`];
        
        if (neighborData) {
            hasNeighbor = true;
            const neighborEdges = getRotatedEdges(neighborData.tile, neighborData.rotation);

            // On vérifie tous les segments du côté concerné (ex: si on check le Nord, on regarde north, north-left, north-right)
            for (const segmentKey of Object.keys(myEdges)) {
                if (segmentKey.startsWith(check.side)) {
                    const myZoneId = myEdges[segmentKey];
                    const oppSegmentKey = opposites[segmentKey];
                    const neighborZoneId = neighborEdges[oppSegmentKey];

                    // Si le voisin possède ce segment, on compare le type de zone
                    if (neighborZoneId) {
                        const myType = tile.zones[myZoneId].type;
                        const neighborType = neighborData.tile.zones[neighborZoneId].type;

                        if (myType !== neighborType) {
                            return false; // Incompatible !
                        }
                    }
                }
            }
        }
    }
    return hasNeighbor;
}

// --- INITIALISATION ET RENDU ---

async function loadTiles() {
    try {
        const response = await fetch('data/tuiles.json');
        const data = await response.json();
        deck = shuffle(data.tuiles);
        
        // Placement de la tuile de départ par défaut à (0,0)
        const startTile = deck.pop();
        placedTiles["0,0"] = { tile: startTile, rotation: 0 };
        
        drawTile();
    } catch (error) {
        console.error("Erreur lors du chargement des tuiles:", error);
    }
}

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

function drawTile() {
    if (deck.length > 0) {
        currentTile = deck.pop();
        currentRotation = 0;
        updateTileDisplay();
        renderBoard();
    } else {
        alert("Plus de tuiles dans le deck !");
    }
}

function updateTileDisplay() {
    currentTileImg.src = currentTile.image;
    currentTileImg.style.transform = `rotate(${currentRotation}deg)`;
}

function renderBoard() {
    board.innerHTML = '';
    
    const keys = Object.keys(placedTiles);
    if (keys.length === 0) return;

    const coords = keys.map(k => k.split(',').map(Number));
    const minX = Math.min(...coords.map(c => c[0])) - 1;
    const maxX = Math.max(...coords.map(c => c[0])) + 1;
    const minY = Math.min(...coords.map(c => c[1])) - 1;
    const maxY = Math.max(...coords.map(c => c[1])) + 1;

    board.style.gridTemplateColumns = `repeat(${maxX - minX + 1}, 100px)`;
    board.style.gridTemplateRows = `repeat(${maxY - minY + 1}, 100px)`;

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            const tileData = placedTiles[`${x},${y}`];

            if (tileData) {
                const img = document.createElement('img');
                img.src = tileData.tile.image;
                img.style.transform = `rotate(${tileData.rotation}deg)`;
                cell.appendChild(img);
            } else if (currentTile && canPlaceTileAt(x, y, currentTile, currentRotation)) {
                cell.classList.add('valid-target');
                cell.onclick = () => placeTile(x, y);
            }
            board.appendChild(cell);
        }
    }
}

function placeTile(x, y) {
    placedTiles[`${x},${y}`] = {
        tile: currentTile,
        rotation: currentRotation
    };
    drawTile();
}

rotateBtn.onclick = () => {
    currentRotation = (currentRotation + 90) % 360;
    updateTileDisplay();
    renderBoard();
};

// Démarrage du jeu
loadTiles();
