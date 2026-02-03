/**
 * Gère le calcul des scores
 */
export class Scoring {
    constructor(zoneMerger) {
        this.zoneMerger = zoneMerger;
    }

    /**
     * Calculer les scores des zones fermées et retourner les meeples
     * Appelé à la fin de chaque tour
     * @returns {scoringResults: [{playerId, points, reason}], meeplesToReturn: [keys]}
     */
    scoreClosedZones(placedMeeples) {
        console.log('💰 Calcul des scores pour zones fermées...');
        
        const scoringResults = [];
        const meeplesToReturn = [];

        // ✅ Récupérer toutes les zones du registry
        const allZones = this.zoneMerger.getAllZones();
        
        // Parcourir toutes les zones mergées
        allZones.forEach(mergedZone => {
            if (!mergedZone.isComplete) return;

            console.log(`✅ Zone ${mergedZone.type} fermée détectée`);

            // Récupérer les meeples dans cette zone
            const meeples = this.zoneMerger.getZoneMeeples(mergedZone, placedMeeples);
            
            if (meeples.length === 0) {
                console.log('  Aucun meeple dans cette zone');
                return;
            }

            // Déterminer qui a la majorité
            const owners = this._getZoneOwners(meeples);
            console.log('  Propriétaires:', owners);

            // Calculer les points
            let points = 0;
            let reason = '';

            if (mergedZone.type === 'city') {
                points = this._scoreClosedCity(mergedZone);
                reason = `Ville fermée (${mergedZone.tiles.length} tuiles, ${mergedZone.shields} blasons)`;
            } else if (mergedZone.type === 'road') {
                points = this._scoreClosedRoad(mergedZone);
                reason = `Route fermée (${mergedZone.tiles.length} tuiles)`;
            } else if (mergedZone.type === 'abbey') {
                points = this._scoreClosedAbbey();
                reason = 'Abbaye complète';
            }

            // Attribuer les points aux propriétaires
            owners.forEach(playerId => {
                scoringResults.push({ playerId, points, reason });
                console.log(`  ${playerId} gagne ${points} points pour ${reason}`);
            });

            // Marquer les meeples pour retour
            meeples.forEach(meeple => {
                meeplesToReturn.push(meeple.key);
            });
        });

        return { scoringResults, meeplesToReturn };
    }

    /**
     * Calculer les points d'une ville fermée
     * 2 points par tuile + 2 points par blason
     */
    _scoreClosedCity(mergedZone) {
        return (mergedZone.tiles.length * 2) + (mergedZone.shields * 2);
    }

    /**
     * Calculer les points d'une route fermée
     * 1 point par tuile
     */
    _scoreClosedRoad(mergedZone) {
        return mergedZone.tiles.length;
    }

    /**
     * Calculer les points d'une abbaye complète
     * 9 points (1 + 8 tuiles autour)
     */
    _scoreClosedAbbey() {
        return 9;
    }

    /**
     * Déterminer les joueurs qui ont la majorité de meeples
     * @returns {Array} Liste des playerIds ayant la majorité
     */
    _getZoneOwners(meeples) {
        const counts = {};
        
        meeples.forEach(meeple => {
            counts[meeple.playerId] = (counts[meeple.playerId] || 0) + 1;
        });

        const maxCount = Math.max(...Object.values(counts));
        
        // Retourner tous les joueurs avec le max (égalité possible)
        return Object.keys(counts).filter(playerId => counts[playerId] === maxCount);
    }

    /**
     * Calculer les scores finaux (fin de partie)
     */
    calculateFinalScores(placedMeeples, gameState) {
        console.log('🏁 Calcul des scores finaux...');
        
        const finalScores = [];
        const allZones = this.zoneMerger.getAllZones();

        // 1. Villes incomplètes : 1 pt/tuile + 1 pt/blason
        allZones.forEach(mergedZone => {
            if (mergedZone.type !== 'city' || mergedZone.isComplete) return;

            const meeples = this.zoneMerger.getZoneMeeples(mergedZone, placedMeeples);
            if (meeples.length === 0) return;

            const owners = this._getZoneOwners(meeples);
            const points = mergedZone.tiles.length + mergedZone.shields;

            owners.forEach(playerId => {
                finalScores.push({
                    playerId,
                    points,
                    reason: `Ville incomplète (${mergedZone.tiles.length} tuiles, ${mergedZone.shields} blasons)`
                });
            });
        });

        // 2. Routes incomplètes : 1 pt/tuile
        allZones.forEach(mergedZone => {
            if (mergedZone.type !== 'road' || mergedZone.isComplete) return;

            const meeples = this.zoneMerger.getZoneMeeples(mergedZone, placedMeeples);
            if (meeples.length === 0) return;

            const owners = this._getZoneOwners(meeples);
            const points = mergedZone.tiles.length;

            owners.forEach(playerId => {
                finalScores.push({
                    playerId,
                    points,
                    reason: `Route incomplète (${mergedZone.tiles.length} tuiles)`
                });
            });
        });

        // 3. Abbayes incomplètes : 1 pt + 1 pt/tuile adjacente
        allZones.forEach(mergedZone => {
            if (mergedZone.type !== 'abbey' || mergedZone.isComplete) return;

            const meeples = this.zoneMerger.getZoneMeeples(mergedZone, placedMeeples);
            if (meeples.length === 0) return;

            const { x, y } = mergedZone.tiles[0];
            const adjacentCount = this._countAdjacentTiles(x, y);
            const points = 1 + adjacentCount;

            meeples.forEach(meeple => {
                finalScores.push({
                    playerId: meeple.playerId,
                    points,
                    reason: `Abbaye incomplète (1 + ${adjacentCount} tuiles adjacentes)`
                });
            });
        });

        // 4. Champs (farmers) : 3 pts par ville complète adjacente
        const closedCities = this.zoneMerger.getClosedCities();
        
        allZones.forEach(mergedZone => {
            if (mergedZone.type !== 'field') return;

            const meeples = this.zoneMerger.getZoneMeeples(mergedZone, placedMeeples);
            if (meeples.length === 0) return;

            const adjacentClosedCities = this._countAdjacentClosedCities(mergedZone, closedCities);
            if (adjacentClosedCities === 0) return;

            const owners = this._getZoneOwners(meeples);
            const points = adjacentClosedCities * 3;

            owners.forEach(playerId => {
                finalScores.push({
                    playerId,
                    points,
                    reason: `Champ (${adjacentClosedCities} villes complètes)`
                });
            });
        });

        return finalScores;
    }

    /**
     * Compter les tuiles adjacentes à une position (pour abbaye incomplète)
     */
    _countAdjacentTiles(x, y) {
        const directions = [
            { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy: 0 },                      { dx: 1, dy: 0 },
            { dx: -1, dy: 1 },  { dx: 0, dy: 1 },  { dx: 1, dy: 1 }
        ];

        let count = 0;
        directions.forEach(({ dx, dy }) => {
            if (this.zoneMerger.board.placedTiles[`${x + dx},${y + dy}`]) {
                count++;
            }
        });

        return count;
    }

    /**
     * Compter les villes complètes adjacentes à un champ
     */
    _countAdjacentClosedCities(fieldZone, closedCities) {
        const adjacentCities = new Set();

        fieldZone.tiles.forEach(({ x, y, zoneIndex }) => {
            const tile = this.zoneMerger.board.placedTiles[`${x},${y}`];
            const zone = tile.zones[zoneIndex];

            // Vérifier les zones connectées sur la même tuile
            if (zone.connectedTo) {
                zone.connectedTo.forEach(connectedIndex => {
                    const connectedZone = tile.zones[connectedIndex];
                    
                    if (connectedZone.type === 'city') {
                        // Trouver si cette city fait partie d'une ville fermée
                        closedCities.forEach((closedCity, cityIndex) => {
                            if (closedCity.tiles.some(t => t.x === x && t.y === y && t.zoneIndex === connectedIndex)) {
                                adjacentCities.add(cityIndex);
                            }
                        });
                    }
                });
            }
        });

        return adjacentCities.size;
    }
}
