export class Board {
    constructor() {
        this.placedTiles = {}; 
    }

    addTile(x, y, tile) {
        this.placedTiles[`${x},${y}`] = tile;
    }

    isFree(x, y) {
        return this.placedTiles[`${x},${y}`] === undefined;
    }

    getTileAt(x, y) {
        return this.placedTiles[`${x},${y}`] || null;
    }

    canPlaceTile(x, y, newTile) {
        const neighbors = [
            { nx: x, ny: y - 1, segments: ['north', 'north-left', 'north-right'], opposite: ['south', 'south-left', 'south-right'] },
            { nx: x + 1, ny: y, segments: ['east', 'east-top', 'east-bottom'], opposite: ['west', 'west-top', 'west-bottom'] },
            { nx: x, ny: y + 1, segments: ['south', 'south-left', 'south-right'], opposite: ['north', 'north-left', 'north-right'] },
            { nx: x - 1, ny: y, segments: ['west', 'west-top', 'west-bottom'], opposite: ['east', 'east-top', 'east-bottom'] }
        ];

        const newZones = newTile.currentZones;
        let hasNeighbor = false;

        for (const { nx, ny, segments, opposite } of neighbors) {
            const neighborTile = this.getTileAt(nx, ny);
            
            if (neighborTile) {
                hasNeighbor = true;
                const neighborZones = neighborTile.currentZones;
                
                // Vérification stricte de chaque segment
                for (let i = 0; i < segments.length; i++) {
                    if (newZones[segments[i]] !== neighborZones[opposite[i]]) {
                        return false; // Si un seul segment diffère, pose interdite
                    }
                }
            }
        }

        // Doit toucher au moins une tuile (sauf pour la première tuile posée via forceFirstTile)
        return hasNeighbor;
    }
}
