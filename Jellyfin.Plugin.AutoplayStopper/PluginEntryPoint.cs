using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.AutoplayStopper;

/// <summary>
/// Point d'entrée serveur : injecte la balise script dans index.html
/// au démarrage du serveur Jellyfin.
/// </summary>
public class PluginEntryPoint : IHostedService
{
    private const string ScriptTag =
        "\n    <!-- AutoPlay Stopper Plugin -->" +
        "\n    <script src=\"/AutoplayStopper/clientscript\" defer></script>";

    private const string ScriptTagMarker = "/AutoplayStopper/clientscript";

    private readonly ILogger<PluginEntryPoint> _logger;

    /// <summary>
    /// Initialise le point d'entrée.
    /// </summary>
    public PluginEntryPoint(ILogger<PluginEntryPoint> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public Task StartAsync(CancellationToken cancellationToken)
    {
        var config = Plugin.Instance?.Configuration;

        if (config is null || !config.EnablePlugin)
        {
            _logger.LogInformation("[AutoplayStopper] Plugin désactivé, injection ignorée.");
            return Task.CompletedTask;
        }

        try
        {
            InjectScriptTag();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "[AutoplayStopper] Impossible d'injecter le script dans index.html. " +
                "Si Jellyfin tourne dans Docker, mappez index.html comme volume (voir README).");
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken)
        => Task.CompletedTask;

    private void InjectScriptTag()
    {
        string[] webRoots =
        {
            "/usr/share/jellyfin/web",
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                "Jellyfin", "Server", "jellyfin-web"),
            Path.Combine(AppContext.BaseDirectory, "jellyfin-web"),
            Path.Combine(AppContext.BaseDirectory, "wwwroot"),
        };

        string? indexPath = null;
        foreach (var root in webRoots)
        {
            var candidate = Path.Combine(root, "index.html");
            if (File.Exists(candidate))
            {
                indexPath = candidate;
                break;
            }
        }

        if (indexPath is null)
        {
            _logger.LogWarning(
                "[AutoplayStopper] index.html introuvable. " +
                "Utilisez le userscript Tampermonkey comme alternative.");
            return;
        }

        var content = File.ReadAllText(indexPath);

        if (content.Contains(ScriptTagMarker, StringComparison.Ordinal))
        {
            _logger.LogInformation("[AutoplayStopper] Script déjà injecté dans {Path}.", indexPath);
            return;
        }

        var injected = content.Replace(
            "</body>",
            ScriptTag + "\n</body>",
            StringComparison.OrdinalIgnoreCase);

        if (injected == content)
        {
            _logger.LogWarning(
                "[AutoplayStopper] Balise </body> non trouvée dans {Path}.", indexPath);
            return;
        }

        File.WriteAllText(indexPath, injected);
        _logger.LogInformation(
            "[AutoplayStopper] Script injecté avec succès dans {Path}.", indexPath);
    }
}
