namespace Cove.Core.Contracts;

/// <summary>
/// Catalog of host-defined page-type keys — the page context an extension targets when contributing a
/// tab or pane (see <c>UITabContribution.PageType</c> / <c>UIPaneContribution.PageType</c>) and the
/// built-in page an extension may override (see <c>UIPageOverride.TargetPage</c>). The wildcard
/// <see cref="Wildcard"/> targets the entire app shell. Const-string catalog authored in stable
/// alphabetical order to keep downstream code generation deterministic.
/// </summary>
public static class UiPageKeys
{
    /// <summary>Targets the entire app shell (full UI override).</summary>
    public const string Wildcard = "*";

    public const string Gallery = "gallery";
    public const string Group = "group";
    public const string Home = "home";
    public const string Image = "image";
    public const string Performer = "performer";
    public const string Settings = "settings";
    public const string Studio = "studio";
    public const string Tag = "tag";
    public const string Video = "video";

    /// <summary>All well-known host page-type keys (including the wildcard), in stable order.</summary>
    public static readonly string[] All =
    [
        Wildcard, Gallery, Group, Home, Image, Performer, Settings, Studio, Tag, Video,
    ];
}
