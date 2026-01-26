// modules/Board.js
export class Board {
    constructor() {
        this.placedTiles = {}; // Format : { "0,0": tuileObjet, "1,0": tuileObjet }
    }

    // Ajouter une tuile
    addTile(x, y, tile) {
        this.placedTiles[`${x},${y}`] = tile;
    }

    // Vérifier les voisins pour savoir si on peut poser la tuile
    getNeighbor(x, y, direction) {
        // direction: 0=nord, 1=est, 2=sud, 3=ouest
        const neighbors = {
            0: `${x},${y-1}`, // Nord
            1: `${x+1},${y}`, // Est
            2: `${x},${y+1}`, // Sud
            3: `${x-1},${y}`  // Ouest
        };
        return this.placedTiles[neighbors[direction]];
    }
}