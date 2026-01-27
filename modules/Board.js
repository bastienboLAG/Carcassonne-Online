/**
 * modules/Board.js
 */
import { areEdgesCompatible } from './Validator.js';

export class Board {
    constructor() {
        this.placedTiles = {}; // "x,y": Tile object
    }

    addTile(x, y, tile) {
        this.placedTiles[`${x},${y}`] = tile;
    }

    isFree(x, y) {
        return !this.placedTiles[`${x},${y}`];
    }

    /**
     * Vérifie si une tuile peut être posée à (x, y)
     * 1. Doit avoir au moins un voisin.
     * 2. Tous les bords touchés doivent être compatibles.
     */
    canPlaceTile(x, y, tileEnMain) {
        // Sécurité : si la case est déjà prise
        if (!this.isFree(x, y)) return false;

        let hasNeighbor = false;
        const neighbors = [
            { dx: 0,  dy: -1, side: 'north' }, // Voisin au dessus (on regarde notre Nord)
            { dx: 0,  dy: 1,  side: 'south' }, // Voisin en dessous (on regarde notre Sud)
            { dx: 1,  dy: 0,  side: 'east'  }, // Voisin à droite (on regarde notre Est)
            { dx: -1, dy: 0,  side: 'west'  }  // Voisin à gauche (on regarde notre Ouest)
        ];

        for (const n of neighbors) {
            const neighborTile = this.placedTiles[`${x + n.dx},${y + n.dy}`];
            
            if (neighborTile) {
                hasNeighbor = true;
                
                // On utilise le Validator pour comparer notre bord 'side' 
                // avec le bord opposé du voisin.
                if (!areEdgesCompatible(tileEnMain, tileEnMain.rotation, neighborTile, neighborTile.rotation, n.side)) {
                    return false; // Désaccord de terrain (ex: route vs ville)
                }
            }
        }

        // Le placement est valide si on a au moins un voisin et aucune erreur de bord
        return hasNeighbor;
    }
}
