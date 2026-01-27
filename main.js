/**
 * CARCASSONNE ONLINE - main.js
 */

const board = document.getElementById('board');
const currentTileImg = document.getElementById('current-tile-img');
const rotateBtn = document.getElementById('rotate-btn');

let deck = [];
let currentTile = null;
let currentRotation = 0;
const placedTiles = {}; // Format : "x,y": { tile, rotation }

// --- CONFIGURATION DE LA LOGIQUE DE BORDURE ---

/**
 * Cette fonction permet de savoir quel segment (clé JSON) se trouve 
 * sur une direction physique donnée (N, S, E, O) selon la rotation.
 */
function getPhysicalSideKeys(direction, rotation) {
    // On calcule l'origine des segments selon la rotation (sens horaire)
    // Si rotation 90, le Nord physique est l'ancien Ouest du JSON
    const directions = ['north', 'east', 'south', 'west'];
    const dirIndex = directions.indexOf(direction);
    const rotationSteps = rotation / 90;
    const originalDirIndex = (dirIndex - rotationSteps + 4) % 4;
    const originalDir = directions[originalDirIndex];

    // Retourne les clés correspondantes dans le JSON pour cette face
    if (originalDir === 'north' || originalDir === 'south') {
        return [originalDir, `${originalDir}-left`, `${originalDir}-right`];
    } else {
        return [originalDir, `${originalDir}-top`, `${originalDir}-bottom`];
    }
}

/**
 * Table de correspondance pour savoir quel segment fait face à quel segment
 * Exemple : le "north-left" d'une tuile touche le "south-left" de la tuile au dessus
 */
const oppositeSegments = {
    "north": "south", "south": "north", "east": "west", "west": "east",
    "north-left": "south-left", "south-left": "north-left",
    "north-right": "south-right", "south-right": "north-right",
    "east-top": "west-top", "west-top": "east-top",
    "east-bottom": "west-bottom", "west-bottom": "east-bottom"
};

/**
 * Vérifie si la tuile piochée peut être posée à (x, y) avec sa rotation actuelle
 */
function isPlacementLegal(x, y, tile, rotation) {
    let hasNeighbor = false;

    // On définit les 4 directions à vérifier
    const neighbors = [
        { dx: 0, dy: -1, side: 'north', oppSide: 'south' }, // Voisin au dessus
        { dx: 0, dy: 1, side: 'south', oppSide: 'north' },  // Voisin en dessous
        { dx: 1, dy: 0, side: 'east', oppSide: 'west' },    // Voisin à droite
        { dx: -1, dy: 0, side: 'west', oppSide: 'east' }    // Voisin à gauche
    ];

    for (const n of neighbors) {
        const neighbor = placedTiles[`${x + n.dx},${y + n.dy}`];
        if (neighbor) {
            hasNeighbor = true;
            
            // 1. Récupérer les clés de segments de ma tuile sur cette face physique
            const myKeys = getPhysicalSideKeys(n.side, rotation);
            
            // 2. Récupérer les clés de segments du voisin sur la face opposée
            const neighborKeys = getPhysicalSideKeys(n.oppSide, neighbor.rotation);

            // 3. Comparer chaque segment qui se touche
            for (const myKey of myKeys) {
                const myZoneId = tile.edges[myKey];
                if (!myZoneId) continue; // Segment inexistant sur cette tuile

                const oppKey = oppositeSegments[myKey];
                // On cherche si le voisin a ce segment spécifique opposé
                const neighborZoneId = neighbor.tile.edges[oppKey];

                if (neighborZoneId) {
                    const myType = tile.zones[myZoneId].type;
                    const neighborType = neighbor.tile.zones[neighborZoneId].type;

                    if (myType !== neighborType) return false; // Incompatible !
                }
            }
        }
    }
    return hasNeighbor;
}

// --- LOGIQUE D'AFFICHAGE ET DE JEU ---

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
            } else if (currentTile) {
                // VERIFICATION DE PLACEMENT ICI
                if (isPlacementLegal(x, y, currentTile, currentRotation)) {
                    cell.classList.add('valid-target');
                    cell.onclick = () => placeTile(x, y);
                }
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

function drawTile() {
    if (deck.length > 0) {
        currentTile = deck.pop();
        currentRotation = 0;
        updateTileDisplay();
        renderBoard();
    } else {
        alert("Plus de tuiles !");
    }
}

function updateTileDisplay() {
    currentTileImg.src = currentTile.image;
    currentTileImg.style.transform = `rotate(${currentRotation}deg)`;
}

rotateBtn.onclick = () => {
    currentRotation = (currentRotation + 90) % 360;
    updateTileDisplay();
    renderBoard(); 
};

async function init() {
    try {
        const response = await fetch('data/tuiles.json');
        const data = await response.json();
        deck = data.tuiles.sort(() => Math.random() - 0.5);

        // Tuile de départ à 50,50
        const startTile = deck.pop();
        placedTiles["50,50"] = { tile: startTile, rotation: 0 };

        drawTile();
    } catch (e) {
        console.error("Erreur de chargement :", e);
    }
}

init();
