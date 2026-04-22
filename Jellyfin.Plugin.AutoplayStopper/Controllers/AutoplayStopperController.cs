using System.IO;
using System.Net.Mime;
using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.AutoplayStopper.Controllers;

/// <summary>
/// Contrôleur HTTP qui sert le script client JavaScript du plugin.
/// Le script est embarqué comme ressource dans la DLL.
/// </summary>
[ApiController]
[Route("AutoplayStopper")]
public class AutoplayStopperController : ControllerBase
{
    private const string ResourceName =
        "Jellyfin.Plugin.AutoplayStopper.Resources.autoplayStopper.js";

    /// <summary>
    /// Retourne le script JavaScript client embarqué.
    /// Accessible anonymement depuis le navigateur via :
    ///   /AutoplayStopper/clientscript
    /// </summary>
    [HttpGet("clientscript")]
    [AllowAnonymous]
    [Produces(MediaTypeNames.Text.Plain)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public IActionResult GetClientScript()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var stream = assembly.GetManifestResourceStream(ResourceName);

        if (stream is null)
        {
            return NotFound("Script resource not found.");
        }

        using var reader = new StreamReader(stream);
        var js = reader.ReadToEnd();

        // Injecte la config serveur dans le script client
        var config = Plugin.Instance?.Configuration;
        var defaultToStopped = (config?.DefaultToStopped ?? false) ? "true" : "false";

        js = js.Replace("__DEFAULT_TO_STOPPED__", defaultToStopped);

        Response.Headers.CacheControl = "no-cache, no-store";
        return Content(js, "application/javascript");
    }

    /// <summary>
    /// Endpoint de statut — permet de vérifier que le plugin est bien chargé.
    /// </summary>
    [HttpGet("status")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetStatus()
    {
        var config = Plugin.Instance?.Configuration;
        return Ok(new
        {
            plugin = "AutoPlay Stopper",
            version = "1.0.0",
            enabled = config?.EnablePlugin ?? true,
            defaultToStopped = config?.DefaultToStopped ?? false
        });
    }
}
