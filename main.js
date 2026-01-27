/**
 * CARCASSONNE ONLINE - main.js
 */

const board = document.getElementById('board');
const currentTileImg = document.getElementById('current-tile-img');
const rotateBtn = document.getElementById('rotate-btn');

let deck = [];
let currentTile = null;
let currentRotation = 0;
const placedTiles = {}; 

// --- MAPPAGE DES ROTATIONS (NL -> ET -> SR -> WB) ---

// On définit ce que devient chaque clé JSON après une rotation de 90°
const rotateKey = (key) => {
    const mapping = {
        "north": "east", "east": "south", "south": "west", "west": "north",
        "north-left": "east-top", "east-top": "south-right", "south-right": "west-bottom", "west-bottom": "north-left",
        "north-right": "east-bottom", "east-bottom": "south-left", "south-left": "west-top", "west-top": "north-right"
    };
    return mapping[key] || key;
};

// Récupère l'ID de zone d'un segment physique après X rotations
function getZoneAtPhysicalSide(tile, physicalSide, rotation) {
    let currentEdges = { ...tile.edges };
    const steps = (rotation / 90) % 4;
    
    // On fait tourner les clés virtuellement
    for (let i = 0; i < steps; i++) {
        let nextEdges = {};
        for (let key in currentEdges) {
            nextEdges[rotateKey(key)] = currentEdges[key];
        }
        currentEdges = nextEdges;
    }
    return currentEdges[physicalSide];
}

// Correspondance des segments face à face
const opposites = {
    "north": "south", "south": "north", "east": "west", "west": "east",
    "north-left": "south-left", "south-left": "north-left",
    "north-right": "south-right", "south-right": "north-right",
    "east-top": "west-top", "west-top": "east-top",
    "east-bottom": "west-bottom", "west-bottom": "east-bottom"
};

/**
 * Validation bord à bord
 */
function isPlacementLegal(x, y, tile, rotation) {
    let hasNeighbor = false;
    const checks = [
        { dx: 0, dy: -1, physSide: 'north' },
        { dx: 0, dy: 1,  physSide: 'south' },
        { dx: 1, dy: 0,  physSide: 'east' },
        { dx: -1, dy: 0, physSide: 'west' }
    ];

    for (const n of checks) {
        const neighbor = placedTiles[`${x + n.dx},${y + n.dy}`];
        if (neighbor) {
            hasNeighbor = true;
            
            // On vérifie les 3 segments potentiels de cette face (ex: north, north-left, north-right)
            const segmentsToTest = [n.physSide];
            if (n.physSide === 'north' || n.physSide === 'south') {
                segmentsToTest.push(`${n.physSide}-left`, `${n.physSide}-right`);
            } else {
                segmentsToTest.push(`${n.physSide}-top`, `${n.physSide}-bottom`);
            }

            for (const physSeg of segmentsToTest) {
                const myZoneId = getZoneAtPhysicalSide(tile, physSeg, rotation);
                const oppPhysSeg = opposites[physSeg];
                const neighborZoneId = getZoneAtPhysicalSide(neighbor.tile, oppPhysSeg, neighbor.rotation);

                if (myZoneId && neighborZoneId) {
                    if (tile.zones[myZoneId].type !== neighbor.tile.zones[neighborZoneId].type) {
                        return false; 
                    }
                }
            }
        }
    }
    return hasNeighbor;
}

// --- RENDU ET INTERFACE ---

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
            } else if (currentTile && isPlacementLegal(x, y, currentTile, currentRotation)) {
                cell.classList.add('valid-target');
                cell.onclick = () => placeTile(x, y);
            }
            board.appendChild(cell);
        }
    }
}

function placeTile(x, y) {
    placedTiles[`${x},${y}`] = { tile: currentTile, rotation: currentRotation };
    drawTile();
}

function drawTile() {
    if (deck.length > 0) {
        currentTile = deck.pop();
        currentRotation = 0;
        updateTileDisplay();
        renderBoard();
    } else {
        currentTile = null;
        updateTileDisplay();
        renderBoard();
    }
}

function updateTileDisplay() {
    if (currentTile && currentTileImg) {
        currentTileImg.src = currentTile.image;
        currentTileImg.style.transform = `rotate(${currentRotation}deg)`;
        currentTileImg.style.display = "block";
    } else if (currentTileImg) {
        currentTileImg.style.display = "none";
    }
}

rotateBtn.onclick = () => {
    if (!currentTile) return;
    currentRotation = (currentRotation + 90) % 360;
    updateTileDisplay();
    renderBoard();
};

async function init() {
    try {
        // ESSAI DE CHEMIN SANS SLASH INITIAL
        const response = await fetch('data/tuiles.json'); 
        if (!response.ok) throw new Error("Fichier non trouvé (404)");
        
        const data = await response.json();
        deck = data.tuiles.sort(() => Math.random() - 0.5);

        const startTile = deck.pop();
        placedTiles["50,50"] = { tile: startTile, rotation: 0 };

        drawTile();
    } catch (e) {
        console.error("Erreur d'initialisation :", e);
    }
}

init();
