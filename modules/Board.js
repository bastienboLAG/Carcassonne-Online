export class Board {
    constructor() {
        this.placedTiles = {}; 
    }

    addTile(x, y, tile) {
        this.placedTiles[`${x},${y}`] = tile;
    }

    isFree(x, y) {
        // Renvoie true si AUCUNE tuile n'existe à ces coordonnées
        return this.placedTiles[`${x},${y}`] === undefined;
    }
}
