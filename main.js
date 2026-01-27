/**
 * CARCASSONNE ONLINE - main.js
 */

const board = document.getElementById('board');
const currentTileImg = document.getElementById('current-tile-img');
const rotateBtn = document.getElementById('rotate-btn');

let deck = [];
let currentTile = null;
let currentRotation = 0;
const placedTiles = {}; // Stockage des tuiles : "x,y": { tile, rotation }

// --- LOGIQUE DE ROTATION ET CORRESPONDANCE ---

/**
 * Mappe les segments du JSON vers leurs positions physiques après rotation.
 * Si rotation = 90, la face "North" physique correspond à l'ancienne face "West" du JSON.
 */
const sideToJSON = {
    0:   { north: 'north', east: 'east', south: 'south', west: 'west' },
    90:  { north: 'west',  east: 'north', south: 'east',  west: 'south' },
    180: { north: 'south', east: 'west',  south: 'north', west: 'east' },
    270: { north: 'east',  east: 'south', south: 'west',  west: 'north' }
};

/**
 * Définit quel suffixe (-left, -top, etc.) correspond à quel segment opposé.
 */
const segmentMatch = {
    "north": "south", "south": "north", "east": "west", "west": "east",
    "north-left": "south-left", "south-left": "north-left",
    "north-right": "south-right", "south-right": "north-right",
    "east-top": "west-top", "west-top": "east-top",
    "east-bottom": "west-bottom", "west-bottom": "east-bottom"
};

/**
 * Vérifie si le placement à (x, y) est légal selon les types de zones.
 */
function isPlacementLegal(x, y, tile, rotation) {
    if (!tile) return false;
    let hasNeighbor = false;

    const neighbors = [
        { dx: 0, dy: -1, side: 'north' },
        { dx: 0, dy: 1,  side: 'south' },
        { dx: 1, dy: 0,  side: 'east' },
        { dx: -1, dy: 0, side: 'west' }
    ];

    for (const n of neighbors) {
        const neighborData = placedTiles[`${x + n.dx},${y + n.dy}`];
        if (neighborData) {
            hasNeighbor = true;

            // On récupère les segments de la face concernée
            const myJsonSide = sideToJSON[rotation][n.side];
            const neighborJsonSide = sideToJSON[neighborData.rotation][segmentMatch[n.side]];

            // Liste des segments à tester sur cette face
            const segments = (n.side === 'north' || n.side === 'south') 
                ? [myJsonSide, `${myJsonSide}-left`, `${myJsonSide}-right`]
                : [myJsonSide, `${myJsonSide}-top`, `${myJsonSide}-bottom`];

            for (const seg of segments) {
                const myZoneId = tile.edges[seg];
                if (!myZoneId) continue;

                // Trouver le segment correspondant chez le voisin
                const oppSeg = segmentMatch[seg];
                const neighborZoneId = neighborData.tile.edges[oppSeg];

                if (neighborZoneId) {
                    const myType = tile.zones[myZoneId]?.type;
                    const neighborType = neighborData.tile.zones[neighborZoneId]?.type;

                    if (myType !== neighborType) return false;
                }
            }
        }
    }
    return hasNeighbor;
}

// --- RENDU ET JEU ---

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
    } else if (deck.length === 0 && currentTile !== null) {
        // Cas de la dernière tuile posée
        currentTile = null;
        updateTileDisplay();
        renderBoard();
    }
}

function updateTileDisplay() {
    if (currentTile) {
        currentTileImg.src = currentTile.image;
        currentTileImg.style.transform = `rotate(${currentRotation}deg)`;
        currentTileImg.style.display = "block";
    } else {
        currentTileImg.style.display = "none";
    }
}

rotateBtn.onclick = () => {
    if (currentTile) {
        currentRotation = (currentRotation + 90) % 360;
        updateTileDisplay();
        renderBoard();
    }
};

async function init() {
    try {
        // Utilisation du chemin relatif strict
        const response = await fetch('./data/tuiles.json');
        if (!response.ok) throw new Error("Erreur HTTP: " + response.status);
        
        const data = await response.json();
        deck = data.tuiles.sort(() => Math.random() - 0.5);

        // Tuile de départ au centre (50, 50)
        const startTile = deck.pop();
        placedTiles["50,50"] = { tile: startTile, rotation: 0 };

        drawTile();
    } catch (e) {
        console.error("Erreur fatale lors du chargement :", e);
        alert("Impossible de charger les tuiles. Vérifiez la console (F12).");
    }
}

init();
