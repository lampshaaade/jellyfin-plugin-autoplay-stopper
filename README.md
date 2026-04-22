# 🛑 AutoPlay Stopper — Plugin Jellyfin

Plugin Jellyfin **installable depuis l'interface web** qui ajoute un bouton directement
dans le lecteur vidéo pour désactiver la lecture automatique de la session en cours.

Idéal pour éviter qu'une série continue de jouer si vous vous endormissez.

---

## ✨ Fonctionnalités

- **Bouton dans le lecteur** — visible dans la barre de contrôles, à côté du bouton plein écran
- **Par session** — l'état Autoplay ON/OFF se remet à ON automatiquement à la fermeture de l'onglet
- **Toast de notification** — quand l'autoplay est bloqué, un message s'affiche brièvement
- **Page de configuration** — accessible depuis le tableau de bord admin Jellyfin
- **Option : démarrage en mode OFF** — pour les utilisateurs qui veulent toujours bloquer l'autoplay

---

## 🚀 Installation depuis l'interface Jellyfin

### Étape 1 — Ajouter le dépôt du plugin

1. Ouvrez le **Tableau de bord** Jellyfin (icône admin en haut à droite)
2. Allez dans **Plugins → Dépôts (Repositories)**
3. Cliquez sur ➕ et renseignez :
   - **Nom** : `AutoPlay Stopper`
   - **URL** : `https://raw.githubusercontent.com/YOUR_USERNAME/jellyfin-plugin-autoplay-stopper/main/manifest.json`
4. Cliquez **Enregistrer**

### Étape 2 — Installer le plugin

1. Allez dans **Plugins → Catalogue**
2. Trouvez **AutoPlay Stopper** dans la liste
3. Cliquez **Installer**
4. **Redémarrez** le serveur Jellyfin

### Étape 3 — Vérification

Après redémarrage, rechargez la page Jellyfin (Ctrl+F5).  
Le plugin apparaît dans **Plugins → Mes plugins** avec le statut Actif.

---

## ⚙️ Configuration

Dans **Dashboard → Plugins → AutoPlay Stopper** :

| Option | Description |
|--------|-------------|
| Activer le plugin | Injecte le bouton dans le lecteur. Désactiver retire le bouton sans désinstaller |
| Démarrer en mode OFF par défaut | Chaque nouvel onglet démarre avec l'autoplay bloqué |

---

## 🐳 Docker — permissions index.html

Si Jellyfin tourne dans Docker, le plugin peut ne pas avoir la permission de modifier
`index.html` (erreur `UnauthorizedAccessException` dans les logs).

**Solution** — mapper `index.html` comme volume :

```bash
# 1. Extraire index.html du conteneur
docker cp jellyfin:/usr/share/jellyfin/web/index.html /votre/config/index.html

# 2. Ajouter le volume dans docker-compose.yml
```

```yaml
services:
  jellyfin:
    image: jellyfin/jellyfin
    volumes:
      - /votre/config:/config
      - /votre/config/index.html:/usr/share/jellyfin/web/index.html  # ← ajouter
```

```bash
# 3. Redémarrer
docker compose up -d
```

Le plugin modifiera ensuite `index.html` via le volume monté.

---

## 🔨 Compilation manuelle (développeurs)

### Prérequis
- [.NET 8 SDK](https://dotnet.microsoft.com/download)

### Build

```bash
git clone https://github.com/YOUR_USERNAME/jellyfin-plugin-autoplay-stopper
cd jellyfin-plugin-autoplay-stopper

dotnet publish Jellyfin.Plugin.AutoplayStopper/Jellyfin.Plugin.AutoplayStopper.csproj \
  --configuration Release \
  --output ./publish

# Créer le zip
cd publish && zip ../autoplay-stopper_1.0.0.0.zip Jellyfin.Plugin.AutoplayStopper.dll
```

### Installation manuelle du DLL

Copiez `Jellyfin.Plugin.AutoplayStopper.dll` dans le dossier plugins de Jellyfin :

| Système | Chemin |
|---------|--------|
| Linux | `/var/lib/jellyfin/plugins/` |
| Docker | `/config/plugins/` |
| Windows (tray) | `%ProgramData%\Jellyfin\Server\plugins\` |
| Windows (direct) | `%UserProfile%\AppData\Local\jellyfin\plugins\` |

Redémarrez Jellyfin.

---

## 📋 Architecture du plugin

```
Jellyfin.Plugin.AutoplayStopper/
├── Plugin.cs                      # Classe principale (IBasePlugin)
├── PluginEntryPoint.cs            # Injection de <script> dans index.html au démarrage
├── Configuration/
│   ├── PluginConfiguration.cs     # Modèle de config (EnablePlugin, DefaultToStopped)
│   └── configPage.html            # Page de config dans le tableau de bord
├── Controllers/
│   └── AutoplayStopperController.cs  # Sert le JS via /AutoplayStopper/clientscript
└── Resources/
    └── autoplayStopper.js         # Script client embarqué dans la DLL
```

**Flux d'exécution :**
1. Jellyfin démarre → `PluginEntryPoint` injecte `<script src="/AutoplayStopper/clientscript">` dans `index.html`
2. Le navigateur charge la page → récupère le script depuis le contrôleur .NET
3. Le script patche `playbackManager.nextTrack()` et injecte le bouton dans le DOM du lecteur
4. L'utilisateur clique le bouton → `sessionStorage` mémorise l'état
5. Fin d'épisode → `nextTrack()` intercepté → lecture stoppée + toast affiché

---

## 📄 Licence

MIT — libre d'utilisation, modification et distribution.  
Le binaire compilé est sous GPLv3 (contrainte imposée par les dépendances Jellyfin).
