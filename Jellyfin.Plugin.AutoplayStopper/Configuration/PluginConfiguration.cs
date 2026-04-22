using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.AutoplayStopper.Configuration;

/// <summary>
/// Configuration persistée du plugin AutoplayStopper.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Active ou désactive l'injection du script dans l'interface web.
    /// Par défaut : activé.
    /// </summary>
    public bool EnablePlugin { get; set; } = true;

    /// <summary>
    /// Démarre en mode "Autoplay OFF" dès le chargement de la page
    /// (utile pour les utilisateurs qui veulent toujours bloquer l'autoplay).
    /// Par défaut : désactivé (l'utilisateur choisit manuellement).
    /// </summary>
    public bool DefaultToStopped { get; set; } = false;
}
