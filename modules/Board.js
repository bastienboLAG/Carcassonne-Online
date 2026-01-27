import { areEdgesCompatible } from './Validator.js';

export class Board {
    constructor() {
        this.placedTiles = {}; 
    }

    addTile(x, y, tile) {
        this.placedTiles[`${x},${y}`] = tile;
    }

    isFree(x, y) {
        return !this.placedTiles[`${x},${y}`];
    }

    canPlaceTile(x, y, tileEnMain) {
        // 1. On vérifie si la case est libre
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
                // On vérifie la compatibilité via le Validator
                if (!areEdgesCompatible(tileEnMain, tileEnMain.rotation, neighbor, neighbor.rotation, dir.side)) {
                    return false; 
                }
            }
        }

        return hasNeighbor;
    }
}
