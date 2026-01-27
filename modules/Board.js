import { areEdgesCompatible } from './Validator.js';

export class Board {
    constructor() {
        this.placedTiles = {}; 
    }

    addTile(x, y, tile) {
        // On s'assure que les coordonnées sont bien stockées en string "x,y"
        this.placedTiles[`${x},${y}`] = tile;
    }

    isFree(x, y) {
        return !this.placedTiles[`${x},${y}`];
    }

    canPlaceTile(x, y, tileEnMain) {
        // 1. Toujours autoriser la toute première tuile du jeu
        if (Object.keys(this.placedTiles).length === 0) {
            return true;
        }

        if (!this.isFree(x, y)) return false;

        let hasNeighbor = false;
        const directions = [
            {dx: 0, dy: -1, side: 'north'},
            {dx: 1, dy: 0,  side: 'east'},
            {dx: 0, dy: 1,  side: 'south'},
            {dx: -1, dy: 0, side: 'west'}
        ];

        for (let dir of directions) {
            const neighbor = this.placedTiles[`${x + dir.dx},${y + dir.dy}`];
            if (neighbor) {
                hasNeighbor = true;
                
                // On vérifie la compatibilité. 
                // Si Validator échoue ou n'est pas prêt, on renvoie false par sécurité
                try {
                    if (!areEdgesCompatible(tileEnMain, tileEnMain.rotation, neighbor, neighbor.rotation, dir.side)) {
                        return false; 
                    }
                } catch (err) {
                    console.error("Erreur Validator:", err);
                    return false;
                }
            }
        }

        return hasNeighbor;
    }
}
