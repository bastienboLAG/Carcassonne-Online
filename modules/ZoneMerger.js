/**
 * Gère le merge incrémental des zones
 */
import { ZoneRegistry } from './ZoneRegistry.js';

export class ZoneMerger {
    constructor(board) {
        this.board = board;
        this.registry = new ZoneRegistry();
        
        // Map pour retrouver rapidement quelle zone contient quelle tuile
        // "x,y,zoneIndex" → zoneId
        this.tileToZone = new Map();
    }

    /**
     * Mise à jour incrémentale après placement d'une nouvelle tuile
     */
    updateZonesForNewTile(x, y) {
        console.log(`🔄 Mise à jour des zones pour nouvelle tuile (${x},${y})`);
        
        const tile = this.board.placedTiles[`${x},${y}`];
        if (!tile) {
            console.error('❌ Tuile non trouvée');
            return;
        }

        // Pour chaque zone de la nouvelle tuile
        tile.zones.forEach((zone, zoneIndex) => {
            this._processNewZone(x, y, zoneIndex, zone);
        });

        // Vérifier les fermetures et mettre à jour isComplete
        this._updateCompletionStatus();
        
        // Marquer les villes fermées dans l'historique
        this._updateClosedCitiesHistory();

        // Debug
        this.registry.listAll();
    }

    /**
     * Traiter une zone de la nouvelle tuile
     * @private
     */
    _processNewZone(x, y, zoneIndex, zone) {
        console.log(`  Traitement zone ${zoneIndex} (${zone.type})`);
        
        const key = `${x},${y},${zoneIndex}`;
        
        // Vérifier si cette zone touche des zones existantes
        const adjacentZones = this._findAdjacentZones(x, y, zoneIndex, zone);
        
        console.log(`    Zones adjacentes trouvées: ${adjacentZones.length}`);

        if (adjacentZones.length === 0) {
            // Nouvelle zone isolée
            const newZone = this.registry.createZone(zone.type);
            newZone.tiles.push({ x, y, zoneIndex });
            this._addShields(newZone, zone);
            this.tileToZone.set(key, newZone.id);
            
        } else if (adjacentZones.length === 1) {
            // Étendre une zone existante
            const existingZone = this.registry.getZone(adjacentZones[0]);
            existingZone.tiles.push({ x, y, zoneIndex });
            this._addShields(existingZone, zone);
            this.tileToZone.set(key, existingZone.id);
            console.log(`    ✅ Ajouté à zone existante ${adjacentZones[0]}`);
            
        } else {
            // Fusionner plusieurs zones + la nouvelle tuile
            console.log(`    🔗 Fusion de ${adjacentZones.length} zones`);
            const primaryZone = this.registry.getZone(adjacentZones[0]);
            
            // Ajouter la nouvelle tuile
            primaryZone.tiles.push({ x, y, zoneIndex });
            this._addShields(primaryZone, zone);
            this.tileToZone.set(key, primaryZone.id);
            
            // Fusionner les autres zones dans la primaire
            for (let i = 1; i < adjacentZones.length; i++) {
                const zoneToMerge = this.registry.getZone(adjacentZones[i]);
                
                // ✅ CORRECTION : Ne pas fusionner si c'est une zone de la MÊME tuile
                // qui a déjà été traitée (et qui n'est pas dans connectedTo)
                const isSameTileZone = zoneToMerge.tiles.some(t => t.x === x && t.y === y);
                if (isSameTileZone) {
                    console.log(`    ⚠️ Skip fusion ${adjacentZones[i]} (même tuile, pas connectée)`);
                    continue;
                }
                
                // Mettre à jour tileToZone pour toutes les tuiles de la zone fusionnée
                zoneToMerge.tiles.forEach(t => {
                    const tKey = `${t.x},${t.y},${t.zoneIndex}`;
                    this.tileToZone.set(tKey, primaryZone.id);
                });
                
                // Fusionner
                this.registry.mergeZones(primaryZone.id, adjacentZones[i]);
            }
        }
        
        // Traiter les zones connectées sur la même tuile
        if (zone.connectedTo) {
            zone.connectedTo.forEach(connectedIndex => {
                const connectedKey = `${x},${y},${connectedIndex}`;
                const currentZoneId = this.tileToZone.get(key);
                const connectedZoneId = this.tileToZone.get(connectedKey);
                
                if (connectedZoneId && currentZoneId !== connectedZoneId) {
                    // Fusionner les zones connectées
                    const zone1 = this.registry.getZone(currentZoneId);
                    const zone2 = this.registry.getZone(connectedZoneId);
                    
                    if (zone1 && zone2 && zone1.type === zone2.type) {
                        console.log(`    🔗 Fusion connexion interne ${currentZoneId} + ${connectedZoneId}`);
                        
                        // Mettre à jour tileToZone
                        zone2.tiles.forEach(t => {
                            const tKey = `${t.x},${t.y},${t.zoneIndex}`;
                            this.tileToZone.set(tKey, currentZoneId);
                        });
                        
                        this.registry.mergeZones(currentZoneId, connectedZoneId);
                    }
                }
            });
        }
    }

    /**
     * Trouver les zones adjacentes qui touchent cette zone
     * @private
     */
    _findAdjacentZones(x, y, zoneIndex, zone) {
        const adjacentZoneIds = new Set();
        
        if (!zone.edges) return [];

        const tile = this.board.placedTiles[`${x},${y}`];
        const rotation = tile ? tile.rotation : 0;

        const edges = Array.isArray(zone.edges) ? zone.edges : [zone.edges];
        
        const directions = [
            { edge: 'north', dx: 0, dy: -1, opposite: 'south' },
            { edge: 'east', dx: 1, dy: 0, opposite: 'west' },
            { edge: 'south', dx: 0, dy: 1, opposite: 'north' },
            { edge: 'west', dx: -1, dy: 0, opposite: 'east' }
        ];

        edges.forEach(edge => {
            const mainDirection = edge.split('-')[0];
            
            // ✅ Appliquer la rotation au edge
            const rotatedEdge = this._rotateEdge(mainDirection, rotation);
            
            const dir = directions.find(d => d.edge === rotatedEdge);
            if (!dir) return;

            const nx = x + dir.dx;
            const ny = y + dir.dy;
            const neighborTile = this.board.placedTiles[`${nx},${ny}`];

            if (!neighborTile) return;

            // Trouver les zones du voisin qui touchent le bord opposé et ont le même type
            neighborTile.zones.forEach((neighborZone, neighborZoneIndex) => {
                if (neighborZone.type !== zone.type) return;
                if (!neighborZone.edges) return;

                const neighborEdges = Array.isArray(neighborZone.edges) ? neighborZone.edges : [neighborZone.edges];
                
                // ✅ Appliquer la rotation aux edges du voisin
                const rotatedNeighborEdges = neighborEdges.map(e => 
                    this._rotateEdge(e.split('-')[0], neighborTile.rotation)
                );
                
                const hasOppositeEdge = rotatedNeighborEdges.includes(dir.opposite);

                if (hasOppositeEdge) {
                    // ✅ Chercher dans le registry au lieu de tileToZone
                    const adjacentZone = this.registry.findZoneContaining(nx, ny, neighborZoneIndex);
                    if (adjacentZone) {
                        adjacentZoneIds.add(adjacentZone.id);
                    }
                }
            });
        });

        return Array.from(adjacentZoneIds);
    }

    /**
     * Appliquer rotation à un edge
     * @private
     */
    _rotateEdge(edge, rotation) {
        if (rotation === 0) return edge;
        
        const edges = ['north', 'east', 'south', 'west'];
        const index = edges.indexOf(edge);
        if (index === -1) return edge;
        
        const rotations = rotation / 90;
        const newIndex = (index + rotations) % 4;
        return edges[newIndex];
    }

    /**
     * Ajouter les blasons d'une zone à une zone mergée
     * @private
     */
    _addShields(mergedZone, localZone) {
        if (localZone.features) {
            const features = Array.isArray(localZone.features) ? localZone.features : [localZone.features];
            if (features.includes('shield')) {
                mergedZone.shields++;
            }
        }
    }

    /**
     * Mettre à jour le statut de fermeture de toutes les zones
     * @private
     */
    _updateCompletionStatus() {
        for (const [id, zone] of this.registry.zones) {
            if (zone.type === 'city') {
                zone.isComplete = this._isCityComplete(zone);
            } else if (zone.type === 'road') {
                zone.isComplete = this._isRoadComplete(zone);
            } else if (zone.type === 'abbey') {
                zone.isComplete = this._isAbbeyComplete(zone);
            }
        }
    }

    /**
     * Mettre à jour l'historique des villes fermées
     * @private
     */
    _updateClosedCitiesHistory() {
        for (const [id, zone] of this.registry.zones) {
            if (zone.type === 'city' && zone.isComplete) {
                this.registry.markCityAsClosed(id);
            }
        }
    }

    /**
     * Vérifier si une ville est complète
     * @private
     */
    _isCityComplete(mergedZone) {
        for (const { x, y, zoneIndex } of mergedZone.tiles) {
            const tile = this.board.placedTiles[`${x},${y}`];
            const zone = tile.zones[zoneIndex];

            if (!zone.edges) continue;

            const edges = Array.isArray(zone.edges) ? zone.edges : [zone.edges];

            for (const edge of edges) {
                const mainDirection = edge.split('-')[0];
                
                // ✅ Appliquer la rotation
                const rotatedEdge = this._rotateEdge(mainDirection, tile.rotation);
                
                const directions = {
                    'north': { dx: 0, dy: -1, opposite: 'south' },
                    'east': { dx: 1, dy: 0, opposite: 'west' },
                    'south': { dx: 0, dy: 1, opposite: 'north' },
                    'west': { dx: -1, dy: 0, opposite: 'east' }
                };

                const dir = directions[rotatedEdge];
                if (!dir) continue;

                const nx = x + dir.dx;
                const ny = y + dir.dy;
                const neighborTile = this.board.placedTiles[`${nx},${ny}`];

                if (!neighborTile) return false;

                const hasMatchingCity = neighborTile.zones.some(nz => {
                    if (nz.type !== 'city' || !nz.edges) return false;
                    const nEdges = Array.isArray(nz.edges) ? nz.edges : [nz.edges];
                    const rotatedNEdges = nEdges.map(e => this._rotateEdge(e.split('-')[0], neighborTile.rotation));
                    return rotatedNEdges.includes(dir.opposite);
                });

                if (!hasMatchingCity) return false;
            }
        }

        return true;
    }

    /**
     * Vérifier si une route est complète
     * @private
     */
    _isRoadComplete(mergedZone) {
        for (const { x, y, zoneIndex } of mergedZone.tiles) {
            const tile = this.board.placedTiles[`${x},${y}`];
            const zone = tile.zones[zoneIndex];

            if (!zone.edges) continue;

            const edges = Array.isArray(zone.edges) ? zone.edges : [zone.edges];
            
            const directions = {
                'north': { dx: 0, dy: -1, opposite: 'south' },
                'east': { dx: 1, dy: 0, opposite: 'west' },
                'south': { dx: 0, dy: 1, opposite: 'north' },
                'west': { dx: -1, dy: 0, opposite: 'east' }
            };

            for (const edge of edges) {
                const mainDirection = edge.split('-')[0];
                
                // ✅ Appliquer la rotation
                const rotatedEdge = this._rotateEdge(mainDirection, tile.rotation);
                const dir = directions[rotatedEdge];
                if (!dir) continue;

                const nx = x + dir.dx;
                const ny = y + dir.dy;
                const neighborTile = this.board.placedTiles[`${nx},${ny}`];

                if (!neighborTile) return false;

                const hasMatchingRoad = neighborTile.zones.some(nz => {
                    if (nz.type !== 'road' || !nz.edges) return false;
                    const nEdges = Array.isArray(nz.edges) ? nz.edges : [nz.edges];
                    const rotatedNEdges = nEdges.map(e => this._rotateEdge(e.split('-')[0], neighborTile.rotation));
                    return rotatedNEdges.includes(dir.opposite);
                });

                if (!hasMatchingRoad) return false;
            }
        }

        return true;
    }

    /**
     * Vérifier si une abbaye est complète
     * @private
     */
    _isAbbeyComplete(mergedZone) {
        if (mergedZone.tiles.length === 0) return false;

        const { x, y } = mergedZone.tiles[0];
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
     * Trouver la zone mergée qui contient une position de meeple
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
            
            positions.forEach(originalPos => {
                const rotatedPos = this._rotatePosition(originalPos, tile.rotation);
                
                if (rotatedPos === position) {
                    targetZoneIndex = index;
                }
            });
        });

        if (targetZoneIndex === null) return null;

        // Trouver la zone mergée via tileToZone
        const key = `${x},${y},${targetZoneIndex}`;
        const zoneId = this.tileToZone.get(key);
        
        return zoneId ? this.registry.getZone(zoneId) : null;
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
     * Rotation de position
     * @private
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

    /**
     * Obtenir toutes les zones mergées (pour scoring)
     */
    getAllZones() {
        return Array.from(this.registry.zones.values());
    }

    /**
     * Obtenir les villes fermées (pour scoring field)
     */
    getClosedCities() {
        return this.registry.getClosedCities();
    }
}
