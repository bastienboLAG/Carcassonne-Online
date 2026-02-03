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
            if (zone.features) {
                const features = Array.isArray(zone.features) ? zone.features : [zone.features];
                if (features.includes('shield')) {
                    group.shields++;
                }
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
                { edge: 'north', dx: 0, dy: -1, opposite: 'south' },
                { edge: 'east', dx: 1, dy: 0, opposite: 'west' },
                { edge: 'south', dx: 0, dy: 1, opposite: 'north' },
                { edge: 'west', dx: -1, dy: 0, opposite: 'east' }
            ];

            directions.forEach(({ edge, dx, dy, opposite }) => {
                // ✅ Gérer les sous-directions (south-right → south)
                const edgeMatches = edges.some(e => e.split('-')[0] === edge);
                if (!edgeMatches) return;

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
        console.log('🔍 Vérification fermeture city, groupe de', group.tiles.length, 'tuiles');
        
        // Pour chaque tuile de la zone, vérifier que tous ses edges ont un voisin avec city
        for (const { x, y, zoneIndex } of group.tiles) {
            const tile = this.board.placedTiles[`${x},${y}`];
            const zone = tile.zones[zoneIndex];

            console.log(`  Tuile (${x},${y}) zone ${zoneIndex}:`, zone.type);
            console.log('    edges:', zone.edges, 'type:', typeof zone.edges, 'isArray:', Array.isArray(zone.edges));

            if (!zone.edges) {
                console.log('    Pas d\'edges, on continue');
                continue;
            }

            // ✅ Vérifier que edges est bien un array
            const edges = Array.isArray(zone.edges) ? zone.edges : [zone.edges];
            console.log('    edges normalisé:', edges);

            // Vérifier chaque edge
            for (const edge of edges) {
                console.log(`    Vérification edge ${edge}...`);
                
                // ✅ Extraire la direction principale (north, east, south, west)
                const mainDirection = edge.split('-')[0]; // "south-right" → "south"
                
                const directions = {
                    'north': { dx: 0, dy: -1, opposite: 'south' },
                    'east': { dx: 1, dy: 0, opposite: 'west' },
                    'south': { dx: 0, dy: 1, opposite: 'north' },
                    'west': { dx: -1, dy: 0, opposite: 'east' }
                };

                const dir = directions[mainDirection];
                if (!dir) {
                    console.log(`      Direction ${edge} inconnue, skip`);
                    continue;
                }

                const nx = x + dir.dx;
                const ny = y + dir.dy;
                const neighborTile = this.board.placedTiles[`${nx},${ny}`];

                // ✅ Pas de tuile voisine = edge ouvert = ville incomplète
                if (!neighborTile) {
                    console.log(`      ❌ Pas de tuile à (${nx},${ny}) → Ville INCOMPLÈTE`);
                    return false;
                }

                // ✅ Vérifier si le voisin a une city sur le bord opposé
                const hasMatchingCity = neighborTile.zones.some(nz => 
                    nz.type === 'city' && nz.edges && nz.edges.includes(dir.opposite)
                );

                // ✅ Pas de city qui correspond = edge ouvert = ville incomplète
                if (!hasMatchingCity) {
                    console.log(`      ❌ Voisin (${nx},${ny}) n'a pas de city sur ${dir.opposite} → Ville INCOMPLÈTE`);
                    return false;
                }
                
                console.log(`      ✅ Voisin (${nx},${ny}) a une city sur ${dir.opposite}`);
            }
        }

        // ✅ Tous les edges sont fermés
        console.log('  ✅ Tous les edges fermés → Ville COMPLÈTE');
        return true;
    }

    /**
     * Vérifier si une route est complète (pas d'extrémités ouvertes)
     */
    _isRoadComplete(group) {
        console.log('🔍 Vérification fermeture road, groupe de', group.tiles.length, 'tuiles');
        
        // Pour chaque tuile de la zone, vérifier que tous ses edges ont un voisin avec road
        for (const { x, y, zoneIndex } of group.tiles) {
            const tile = this.board.placedTiles[`${x},${y}`];
            const zone = tile.zones[zoneIndex];

            console.log(`  Tuile (${x},${y}) zone ${zoneIndex}:`, zone.type);
            console.log('    edges:', zone.edges, 'type:', typeof zone.edges, 'isArray:', Array.isArray(zone.edges));

            if (!zone.edges) {
                console.log('    Pas d\'edges, on continue');
                continue;
            }

            // ✅ Vérifier que edges est bien un array
            const edges = Array.isArray(zone.edges) ? zone.edges : [zone.edges];
            console.log('    edges normalisé:', edges);

            const directions = {
                'north': { dx: 0, dy: -1, opposite: 'south' },
                'east': { dx: 1, dy: 0, opposite: 'west' },
                'south': { dx: 0, dy: 1, opposite: 'north' },
                'west': { dx: -1, dy: 0, opposite: 'east' }
            };

            for (const edge of edges) {
                console.log(`    Vérification edge ${edge}...`);
                
                // ✅ Extraire la direction principale (north, east, south, west)
                const mainDirection = edge.split('-')[0];
                
                const dir = directions[mainDirection];
                if (!dir) {
                    console.log(`      Direction ${edge} inconnue, skip`);
                    continue;
                }

                const nx = x + dir.dx;
                const ny = y + dir.dy;
                const neighborTile = this.board.placedTiles[`${nx},${ny}`];

                // ✅ Pas de tuile voisine = extrémité ouverte = route incomplète
                if (!neighborTile) {
                    console.log(`      ❌ Pas de tuile à (${nx},${ny}) → Route INCOMPLÈTE`);
                    return false;
                }

                // ✅ Vérifier si le voisin a une road sur le bord opposé
                const hasMatchingRoad = neighborTile.zones.some(nz => 
                    nz.type === 'road' && nz.edges && nz.edges.includes(dir.opposite)
                );

                // ✅ Pas de road qui correspond = extrémité ouverte = route incomplète
                if (!hasMatchingRoad) {
                    console.log(`      ❌ Voisin (${nx},${ny}) n'a pas de road sur ${dir.opposite} → Route INCOMPLÈTE`);
                    return false;
                }
                
                console.log(`      ✅ Voisin (${nx},${ny}) a une road sur ${dir.opposite}`);
            }
        }

        // ✅ Tous les edges sont fermés
        console.log('  ✅ Tous les edges fermés → Route COMPLÈTE');
        return true;
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
        console.log(`🔍 Recherche zone mergée pour position ${position} sur tuile (${x},${y})`);
        
        const tile = this.board.placedTiles[`${x},${y}`];
        if (!tile) {
            console.log('  ❌ Tuile non trouvée');
            return null;
        }

        // Trouver quelle zone locale contient cette position
        let targetZoneIndex = null;
        tile.zones.forEach((zone, index) => {
            const positions = Array.isArray(zone.meeplePosition) 
                ? zone.meeplePosition 
                : [zone.meeplePosition];
            
            // ✅ FIX: Appliquer la rotation AVANT de comparer (pas l'inverse)
            // La position reçue est déjà la position affichée (après rotation)
            // Il faut vérifier si cette position correspond à une zone APRÈS rotation
            positions.forEach(originalPos => {
                const rotatedPos = this._rotatePosition(originalPos, tile.rotation);
                console.log(`  Zone ${index} (${zone.type}): pos originale=${originalPos}, après rotation=${rotatedPos}, cherché=${position}`);
                
                if (rotatedPos === position) {
                    targetZoneIndex = index;
                    console.log(`    ✅ Match trouvé dans zone ${index}`);
                }
            });
        });

        if (targetZoneIndex === null) {
            console.log('  ❌ Position non trouvée dans aucune zone');
            return null;
        }

        // Trouver le groupe mergé qui contient cette zone
        const mergedZone = this.mergedZones.find(group => 
            group.tiles.some(t => t.x === x && t.y === y && t.zoneIndex === targetZoneIndex)
        );
        
        if (mergedZone) {
            console.log(`  ✅ Zone mergée trouvée: type=${mergedZone.type}, ${mergedZone.tiles.length} tuiles`);
        } else {
            console.log('  ❌ Aucune zone mergée correspondante');
        }
        
        return mergedZone;
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
        console.log(`🔍 Recherche meeples dans zone ${mergedZone.type} (${mergedZone.tiles.length} tuiles)`);
        console.log('   placedMeeples:', Object.keys(placedMeeples));
        
        const meeples = [];

        mergedZone.tiles.forEach(({ x, y, zoneIndex }) => {
            const tile = this.board.placedTiles[`${x},${y}`];
            const zone = tile.zones[zoneIndex];

            console.log(`   Tuile (${x},${y}) zone ${zoneIndex}:`);

            const positions = Array.isArray(zone.meeplePosition) 
                ? zone.meeplePosition 
                : [zone.meeplePosition];
            
            console.log('     positions originales:', positions);

            positions.forEach(pos => {
                const rotatedPos = this._rotatePosition(pos, tile.rotation);
                const key = `${x},${y},${rotatedPos}`;
                
                console.log(`     pos ${pos} → rotatedPos ${rotatedPos} → key "${key}"`);

                if (placedMeeples[key]) {
                    console.log(`       ✅ Meeple trouvé:`, placedMeeples[key]);
                    meeples.push({
                        ...placedMeeples[key],
                        x, y, position: rotatedPos, key
                    });
                } else {
                    console.log(`       ❌ Pas de meeple à cette clé`);
                }
            });
        });

        console.log(`   Total meeples trouvés: ${meeples.length}`);
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
