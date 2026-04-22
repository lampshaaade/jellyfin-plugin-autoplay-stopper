using System;
using System.Collections.Generic;
using Jellyfin.Plugin.AutoplayStopper.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace Jellyfin.Plugin.AutoplayStopper;

/// <summary>
/// Plugin principal AutoplayStopper.
/// Ajoute un bouton dans le lecteur Jellyfin pour désactiver l'autoplay par session.
/// </summary>
public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    /// <summary>Identifiant unique du plugin.</summary>
    public static readonly Guid StaticId = new("a1b2c3d4-e5f6-7890-abcd-ef1234567890");

    /// <summary>Instance singleton accessible depuis le contrôleur HTTP.</summary>
    public static Plugin? Instance { get; private set; }

    /// <inheritdoc />
    public override Guid Id => StaticId;

    /// <inheritdoc />
    public override string Name => "AutoPlay Stopper";

    /// <inheritdoc />
    public override string Description =>
        "Ajoute un bouton dans le lecteur vidéo pour désactiver l'autoplay de la session en cours. " +
        "Idéal pour éviter qu'une série continue de jouer en cas d'endormissement.";

    /// <summary>
    /// Initialise une nouvelle instance du plugin.
    /// </summary>
    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    /// <inheritdoc />
    public IEnumerable<PluginPageInfo> GetPages()
    {
        // Page de configuration accessible depuis Dashboard > Plugins > AutoPlay Stopper
        yield return new PluginPageInfo
        {
            Name = "AutoPlay Stopper",
            EmbeddedResourcePath = $"{GetType().Namespace}.Configuration.configPage.html",
            EnableInMainMenu = false
        };
    }
}
