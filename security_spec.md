# Spécification de Sécurité — BCECO / PDL-145T Assistant de Fiche Terrain

## 1. Invariants de Données et d'Autorisation

1. **Bipartition stricte des rôles** : Seuls deux rôles opérationnels existent (`COORDINATEUR` et `AGENT_TERRAIN`). Aucun utilisateur ne peut s'auto-attribuer le rôle `COORDINATEUR`.
2. **Isolation PII** : Les documents `users/{userId}` contiennent `email` et `phone` ; ils ne sont lisibles que par le propriétaire (`request.auth.uid == userId`) ou par un Coordonnateur vérifié.
3. **Isolation des ouvrages par affectation** : Un agent ne peut lire (`get`/`list`) un document `projects/{projectId}` que si son UID figure dans `resource.data.assignedAgentIds`. Il ne peut jamais créer, modifier ou supprimer un ouvrage officiel.
4. **Immutabilité des données contractuelles et historiques** : Un agent ne peut jamais modifier une fiche terrain une fois `VALIDE` (`status == 'VALIDE'` est un état terminal verrouillé pour les agents). Aucune fiche soumise ou validée ne peut être supprimée par un agent.
5. **Contrôle des affectations** : Seul le Coordonnateur peut créer, réaffecter ou clôturer un document dans `agent_assignments`.
6. **Génération des rapports consolidés** : Seul le Coordonnateur peut lire ou écrire dans `generated_reports`.
7. **Piste d'audit immuable** : `audit_logs` interdit toute mise à jour (`update: if false`) et toute suppression (`delete: if false`).
8. **Intégrité temporelle et bornes volumétriques** : Tous les identifiants respectent `^[a-zA-Z0-9_\-]+$` (≤ 128 caractères), toutes les chaînes ont des bornes `.size()`, les taux TEP/TEF sont bornés `[0, 100]`, et les horodatages serveur sont validés.

## 2. Les 12 Payloads Malveillants (« Dirty Dozen »)

1. **Auto-élévation de privilège** : Un agent tente de créer ou mettre à jour `/users/{agentUid}` avec `role: "COORDINATEUR"`. -> **PERMISSION_DENIED**.
2. **Fuite PII inter-agents** : `agent1` tente `get` ou `list` sur `/users/agent2`. -> **PERMISSION_DENIED**.
3. **Lecture d'ouvrage non affecté** : `agent1` tente `get` sur `/projects/PRJ-UNASSIGNED` où son UID n'est pas dans `assignedAgentIds`. -> **PERMISSION_DENIED**.
4. **Altération du registre officiel** : `agent1` tente `update` sur `/projects/PRJ-001` pour modifier `contractor` ou `definitiveReceptionDeadline`. -> **PERMISSION_DENIED**.
5. **Création d'affectation par un agent** : `agent1` tente `create` dans `/agent_assignments/AFF-FAKE`. -> **PERMISSION_DENIED**.
6. **Usurpation d'identité sur une fiche** : `agent1` tente `create` dans `/field_reports/REP-SPOOF` avec `agentId: "agent2"`. -> **PERMISSION_DENIED**.
7. **Saut d'état (auto-validation)** : `agent1` tente `create` ou `update` sur `/field_reports/REP-001` avec `status: "VALIDE"`. -> **PERMISSION_DENIED**.
8. **Altération d'une fiche validée (état terminal)** : `agent1` tente `update` sur une fiche existante dont `status == "VALIDE"`. -> **PERMISSION_DENIED**.
9. **Suppression d'historique** : `agent1` tente `delete` sur `/field_reports/REP-001` ou `/audit_logs/AUD-001`. -> **PERMISSION_DENIED**.
10. **Shadow Update / Champ fantôme** : Un utilisateur tente d'injecter `isAdminOverride: true` dans `/field_reports/REP-001`. -> **PERMISSION_DENIED**.
11. **Value Poisoning / TEP hors bornes** : `agent1` tente de soumettre `currentTep: 150` ou un ID de 2 Ko. -> **PERMISSION_DENIED**.
12. **Génération non autorisée de rapport consolidé** : `agent1` tente `create` dans `/generated_reports/GEN-FAKE`. -> **PERMISSION_DENIED**.
