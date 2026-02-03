/**
 * Registre central pour toutes les zones mergées du plateau
 * Persiste en mémoire et se met à jour incrémentalement
 */
export class ZoneRegistry {
    constructor() {
        this.zones = new Map();              // ID → MergedZone
        this.nextId = 1;                     // Compteur pour générer IDs
        this.closedCitiesHistory = [];       // Villes fermées (pour scoring fields)
    }

    /**
     * Créer une nouvelle zone mergée
     */
    createZone(type) {
        const id = `zone_${this.nextId++}`;
        const zone = {
            id: id,
            type: type,
            tiles: [],           // [{x, y, zoneIndex}]
            isComplete: false,
            shields: 0
        };
        this.zones.set(id, zone);
        console.log(`📝 Nouvelle zone créée: ${id} (${type})`);
        return zone;
    }

    /**
     * Récupérer une zone par ID
     */
    getZone(id) {
        return this.zones.get(id);
    }

    /**
     * Supprimer une zone (quand elle fusionne avec une autre)
     */
    deleteZone(id) {
        console.log(`🗑️ Zone supprimée: ${id}`);
        this.zones.delete(id);
    }

    /**
     * Fusionner deux zones en une seule
     */
    mergeZones(zoneId1, zoneId2) {
        const zone1 = this.zones.get(zoneId1);
        const zone2 = this.zones.get(zoneId2);

        if (!zone1 || !zone2) {
            console.error('❌ Tentative de fusion de zones inexistantes');
            return null;
        }

        if (zone1.type !== zone2.type) {
            console.error('❌ Tentative de fusion de zones de types différents');
            return null;
        }

        console.log(`🔗 Fusion ${zoneId1} + ${zoneId2}`);

        // Fusionner zone2 dans zone1
        zone1.tiles.push(...zone2.tiles);
        zone1.shields += zone2.shields;

        // Supprimer zone2
        this.deleteZone(zoneId2);

        return zone1;
    }

    /**
     * Trouver la zone mergée qui contient une tuile spécifique
     */
    findZoneContaining(x, y, zoneIndex) {
        for (const [id, zone] of this.zones) {
            const found = zone.tiles.find(t => t.x === x && t.y === y && t.zoneIndex === zoneIndex);
            if (found) {
                return zone;
            }
        }
        return null;
    }

    /**
     * Marquer une ville comme fermée (pour historique)
     */
    markCityAsClosed(zoneId) {
        const zone = this.zones.get(zoneId);
        if (zone && zone.type === 'city' && zone.isComplete) {
            // Vérifier si déjà dans l'historique
            if (!this.closedCitiesHistory.includes(zoneId)) {
                this.closedCitiesHistory.push(zoneId);
                console.log(`🏰 Ville fermée ajoutée à l'historique: ${zoneId}`);
            }
        }
    }

    /**
     * Obtenir toutes les villes fermées
     */
    getClosedCities() {
        return this.closedCitiesHistory.map(id => this.zones.get(id)).filter(z => z);
    }

    /**
     * Lister toutes les zones (debug)
     */
    listAll() {
        console.log('📋 Zones mergées actuelles:');
        for (const [id, zone] of this.zones) {
            console.log(`  ${id}: ${zone.type}, ${zone.tiles.length} tuiles, fermée=${zone.isComplete}`);
        }
    }
}
