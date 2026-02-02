/**
 * Gère le merge des zones entre tuiles adjacentes
 */
export class ZoneMerger {
    constructor(board) {
        this.board = board;
        this.mergedZones = []; // Tableau de zones fusionnées
    }

    /**
     * Fusionner toutes les zones du plateau
     * @returns {Array} Tableau de zones mergées [{tiles: [{x, y, zoneIndex}], type, isComplete, shields}]
     */
    mergeZones() {
        console.log('🔄 Début du merge des zones...');
        this.mergedZones = [];
        const processedZones = new Set(); // "x,y,zoneIndex"

        // Parcourir toutes les tuiles posées
        Object.entries(this.board.placedTiles).forEach(([key, tile]) => {
            const [x, y] = key.split(',').map(Number);

            // Pour chaque zone de la tuile
            tile.zones.forEach((zone, zoneIndex) => {
                const zoneKey = `${x},${y},${zoneIndex}`;
                
                if (processedZones.has(zoneKey)) return;

                // Créer un nouveau groupe de zones fusionnées
                const mergedGroup = this._expandZone(x, y, zoneIndex, processedZones);
                
                if (mergedGroup.tiles.length > 0) {
                    this.mergedZones.push(mergedGroup);
                }
            });
        });

        console.log(`✅ ${this.mergedZones.length} zones mergées trouvées`);
        return this.mergedZones;
    }

    /**
     * Expansion récursive d'une zone pour trouver toutes les zones connectées
     * @private
     */
    _expandZone(startX, startY, startZoneIndex, processedZones) {
        const startTile = this.board.placedTiles[`${startX},${startY}`];
        if (!startTile) return { tiles: [], type: null, isComplete: false, shields: 0 };

        const startZone = startTile.zones[startZoneIndex];
        const zoneType = startZone.type;

        const group = {
            tiles: [],
            type: zoneType,
            isComplete: false,
            shields: 0
        };

        const queue = [{ x: startX, y: startY, zoneIndex: startZoneIndex }];
        const visited = new Set();

        while (queue.length > 0) {
            const { x, y, zoneIndex } = queue.shift();
            const key = `${x},${y},${zoneIndex}`;

            if (visited.has(key)) continue;
            visited.add(key);
            processedZones.add(key);

            const tile = this.board.placedTiles[`${x},${y}`];
            if (!tile) continue;

            const zone = tile.zones[zoneIndex];
            if (zone.type !== zoneType) continue;

            // Ajouter la tuile au groupe
            group.tiles.push({ x, y, zoneIndex });

            // Compter les blasons (shields)
            if (zone.features && zone.features.includes('shield')) {
                group.shields++;
            }

            // Explorer les zones connectées sur la même tuile
            if (zone.connectedTo) {
                zone.connectedTo.forEach(connectedIndex => {
                    const connectedKey = `${x},${y},${connectedIndex}`;
                    if (!visited.has(connectedKey)) {
                        queue.push({ x, y, zoneIndex: connectedIndex });
                    }
                });
            }

            // Explorer les tuiles adjacentes
            const edges = zone.edges || [];
            const directions = [
                { edge: 'N', dx: 0, dy: -1, opposite: 'S' },
                { edge: 'E', dx: 1, dy: 0, opposite: 'W' },
                { edge: 'S', dx: 0, dy: 1, opposite: 'N' },
                { edge: 'W', dx: -1, dy: 0, opposite: 'E' }
            ];

            directions.forEach(({ edge, dx, dy, opposite }) => {
                if (!edges.includes(edge)) return;

                const nx = x + dx;
                const ny = y + dy;
                const neighborTile = this.board.placedTiles[`${nx},${ny}`];

                if (!neighborTile) return;

                // Trouver les zones du voisin qui touchent le bord opposé et ont le même type
                neighborTile.zones.forEach((neighborZone, neighborZoneIndex) => {
                    if (neighborZone.type === zoneType && neighborZone.edges && neighborZone.edges.includes(opposite)) {
                        const neighborKey = `${nx},${ny},${neighborZoneIndex}`;
                        if (!visited.has(neighborKey)) {
                            queue.push({ x: nx, y: ny, zoneIndex: neighborZoneIndex });
                        }
                    }
                });
            });
        }

        // Vérifier si la zone est complète
        group.isComplete = this._isZoneComplete(group);

        return group;
    }

    /**
     * Vérifier si une zone est complète (fermée)
     */
    _isZoneComplete(group) {
        if (group.type === 'city') {
            return this._isCityComplete(group);
        } else if (group.type === 'road') {
            return this._isRoadComplete(group);
        } else if (group.type === 'abbey') {
            return this._isAbbeyComplete(group);
        }
        return false; // Fields ne se ferment jamais
    }

    /**
     * Vérifier si une ville est complète (pas de bords ouverts)
     */
    _isCityComplete(group) {
        const openEdges = new Set();

        group.tiles.forEach(({ x, y, zoneIndex }) => {
            const tile = this.board.placedTiles[`${x},${y}`];
            const zone = tile.zones[zoneIndex];

            if (!zone.edges) return;

            zone.edges.forEach(edge => {
                const edgeKey = `${x},${y},${edge}`;

                // Vérifier s'il y a une tuile adjacente avec une city qui touche
                const directions = {
                    'N': { dx: 0, dy: -1, opposite: 'S' },
                    'E': { dx: 1, dy: 0, opposite: 'W' },
                    'S': { dx: 0, dy: 1, opposite: 'N' },
                    'W': { dx: -1, dy: 0, opposite: 'E' }
                };

                const dir = directions[edge];
                if (!dir) return;

                const nx = x + dir.dx;
                const ny = y + dir.dy;
                const neighborTile = this.board.placedTiles[`${nx},${ny}`];

                if (!neighborTile) {
                    openEdges.add(edgeKey);
                    return;
                }

                // Vérifier si le voisin a une city sur le bord opposé
                const hasMatchingCity = neighborTile.zones.some(nz => 
                    nz.type === 'city' && nz.edges && nz.edges.includes(dir.opposite)
                );

                if (!hasMatchingCity) {
                    openEdges.add(edgeKey);
                }
            });
        });

        return openEdges.size === 0;
    }

    /**
     * Vérifier si une route est complète (2 extrémités fermées)
     */
    _isRoadComplete(group) {
        let endpoints = 0;

        group.tiles.forEach(({ x, y, zoneIndex }) => {
            const tile = this.board.placedTiles[`${x},${y}`];
            const zone = tile.zones[zoneIndex];

            if (!zone.edges) return;

            const directions = {
                'N': { dx: 0, dy: -1, opposite: 'S' },
                'E': { dx: 1, dy: 0, opposite: 'W' },
                'S': { dx: 0, dy: 1, opposite: 'N' },
                'W': { dx: -1, dy: 0, opposite: 'E' }
            };

            zone.edges.forEach(edge => {
                const dir = directions[edge];
                if (!dir) return;

                const nx = x + dir.dx;
                const ny = y + dir.dy;
                const neighborTile = this.board.placedTiles[`${nx},${ny}`];

                if (!neighborTile) {
                    endpoints++;
                    return;
                }

                // Vérifier si le voisin a une road sur le bord opposé
                const hasMatchingRoad = neighborTile.zones.some(nz => 
                    nz.type === 'road' && nz.edges && nz.edges.includes(dir.opposite)
                );

                if (!hasMatchingRoad) {
                    endpoints++;
                }
            });
        });

        // Une route est complète si elle n'a pas d'extrémités ouvertes
        return endpoints === 0;
    }

    /**
     * Vérifier si une abbaye est complète (8 tuiles autour)
     */
    _isAbbeyComplete(group) {
        if (group.tiles.length === 0) return false;

        const { x, y } = group.tiles[0];
        const directions = [
            { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy: 0 },                      { dx: 1, dy: 0 },
            { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 }
        ];

        let surroundingTiles = 0;
        directions.forEach(({ dx, dy }) => {
            if (this.board.placedTiles[`${x + dx},${y + dy}`]) {
                surroundingTiles++;
            }
        });

        return surroundingTiles === 8;
    }

    /**
     * Trouver la zone mergée qui contient une position de meeple spécifique
     */
    findMergedZoneForPosition(x, y, position) {
        const tile = this.board.placedTiles[`${x},${y}`];
        if (!tile) return null;

        // Trouver quelle zone locale contient cette position
        let targetZoneIndex = null;
        tile.zones.forEach((zone, index) => {
            const positions = Array.isArray(zone.meeplePosition) 
                ? zone.meeplePosition 
                : [zone.meeplePosition];
            
            // Appliquer la rotation inverse pour trouver la position originale
            const originalPos = this._reverseRotatePosition(position, tile.rotation);
            
            if (positions.includes(originalPos)) {
                targetZoneIndex = index;
            }
        });

        if (targetZoneIndex === null) return null;

        // Trouver le groupe mergé qui contient cette zone
        return this.mergedZones.find(group => 
            group.tiles.some(t => t.x === x && t.y === y && t.zoneIndex === targetZoneIndex)
        );
    }

    /**
     * Appliquer la rotation inverse pour retrouver la position originale
     */
    _reverseRotatePosition(position, rotation) {
        if (rotation === 0) return position;

        const row = Math.floor((position - 1) / 5);
        const col = (position - 1) % 5;
        
        let newRow = row;
        let newCol = col;
        
        // Rotation inverse (anti-horaire)
        const rotations = (360 - rotation) / 90;
        for (let i = 0; i < rotations; i++) {
            const tempRow = newRow;
            newRow = newCol;
            newCol = 4 - tempRow;
        }
        
        return (newRow * 5) + newCol + 1;
    }

    /**
     * Obtenir tous les meeples dans une zone mergée
     */
    getZoneMeeples(mergedZone, placedMeeples) {
        const meeples = [];

        mergedZone.tiles.forEach(({ x, y, zoneIndex }) => {
            const tile = this.board.placedTiles[`${x},${y}`];
            const zone = tile.zones[zoneIndex];

            const positions = Array.isArray(zone.meeplePosition) 
                ? zone.meeplePosition 
                : [zone.meeplePosition];

            positions.forEach(pos => {
                const rotatedPos = this._rotatePosition(pos, tile.rotation);
                const key = `${x},${y},${rotatedPos}`;

                if (placedMeeples[key]) {
                    meeples.push({
                        ...placedMeeples[key],
                        x, y, position: rotatedPos, key
                    });
                }
            });
        });

        return meeples;
    }

    /**
     * Rotation de position (identique à home.js)
     */
    _rotatePosition(position, rotation) {
        if (rotation === 0) return position;
        
        const row = Math.floor((position - 1) / 5);
        const col = (position - 1) % 5;
        
        let newRow = row;
        let newCol = col;
        
        const rotations = rotation / 90;
        for (let i = 0; i < rotations; i++) {
            const tempRow = newRow;
            newRow = newCol;
            newCol = 4 - tempRow;
        }
        
        return (newRow * 5) + newCol + 1;
    }
}
