export class Board {
    constructor() { this.placedTiles = {}; }
    addTile(x, y, tile) { this.placedTiles[`${x},${y}`] = tile; }
    isFree(x, y) { return !this.placedTiles[`${x},${y}`]; }

    canPlaceTile(x, y, newTile) {
        const adj = [
            { nx: x, ny: y - 1, s: ['north', 'north-left', 'north-right'], o: ['south', 'south-left', 'south-right'] },
            { nx: x + 1, ny: y, s: ['east', 'east-top', 'east-bottom'], o: ['west', 'west-top', 'west-bottom'] },
            { nx: x, ny: y + 1, s: ['south', 'south-left', 'south-right'], o: ['north', 'north-left', 'north-right'] },
            { nx: x - 1, ny: y, s: ['west', 'west-top', 'west-bottom'], o: ['east', 'east-top', 'east-bottom'] }
        ];

        let hasNeighbor = false;
        const newZ = newTile.currentZones;

        for (const { nx, ny, s, o } of adj) {
            const target = this.placedTiles[`${nx},${ny}`];
            if (target) {
                hasNeighbor = true;
                const targetZ = target.currentZones;
                // Si un seul segment ne matche pas, on renvoie false
                if (s.some((side, i) => newZ[side] !== targetZ[o[i]])) return false;
            }
        }
        return hasNeighbor;
    }
}
